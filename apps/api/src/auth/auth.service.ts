import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { RateLimiter } from '../common/rate-limiter';
import { config } from '../config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { hashPassword, verifyPassword } from './password';
import { daysFromNow, hashToken, newRefreshToken } from './tokens';

export interface Session {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly limiter: RateLimiter,
  ) {}

  /** Toute inscription crée un compte d'habitant : seuls les administrateurs attribuent les autres rôles. */
  async register(dto: RegisterDto): Promise<Session> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail');
    }
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash: await hashPassword(dto.password) },
    });
    return this.openSession(user.id, user.email, user.role);
  }

  async login(dto: LoginDto, ip: string): Promise<Session> {
    // Fenêtre d'une minute par couple IP + e-mail : ralentit la force brute
    // sans bloquer un autre habitant derrière la même adresse IP.
    const key = `login:${ip}:${dto.email}`;
    if (!this.limiter.hit(key, config.loginAttempts, 60_000)) {
      throw new HttpException('Trop de tentatives. Réessayez dans une minute.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Même message que l'e-mail existe ou non : on ne révèle pas quels comptes existent.
    const valid = user ? await verifyPassword(dto.password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new UnauthorizedException('E-mail ou mot de passe incorrect');
    }

    this.limiter.reset(key);
    return this.openSession(user.id, user.email, user.role);
  }

  /**
   * Rotation du jeton de rafraîchissement : chaque utilisation le consomme et
   * en émet un nouveau dans la même famille. Si un jeton déjà consommé est
   * présenté à nouveau, c'est qu'il a été copié — toute la famille est révoquée.
   */
  async refresh(token: string | undefined): Promise<Session> {
    if (!token) throw new UnauthorizedException('Session absente');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Session invalide');

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session révoquée, reconnectez-vous');
    }
    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expirée');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    // Le rôle est relu en base : une promotion ou une rétrogradation est prise en compte ici.
    return this.openSession(stored.user.id, stored.user.email, stored.user.role, stored.familyId);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { reports: true, supports: true } },
      },
    });
    const { _count, ...rest } = user;
    return { ...rest, reportCount: _count.reports, supportCount: _count.supports };
  }

  private async openSession(
    userId: string,
    email: string,
    role: Role,
    familyId: string = randomUUID(),
  ): Promise<Session> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role },
      { secret: config.jwtAccessSecret, expiresIn: config.accessTtl },
    );
    const refreshToken = newRefreshToken();
    const refreshExpiresAt = daysFromNow(config.refreshTtlDays);

    await this.prisma.refreshToken.create({
      data: { tokenHash: hashToken(refreshToken), familyId, userId, expiresAt: refreshExpiresAt },
    });
    return { accessToken, refreshToken, refreshExpiresAt };
  }
}
