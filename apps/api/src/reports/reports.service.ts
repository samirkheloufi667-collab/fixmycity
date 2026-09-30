import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators';
import { publicName } from '../common/display';
import { RateLimiter } from '../common/rate-limiter';
import { config } from '../config';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateReportDto, ListQueryDto, MapQueryDto, StatusDto } from './dto';
import { boundingBox, haversineMeters, parseBbox, Point } from './geo';
import { canTransition, OPEN_STATUSES, requiresMessage } from './status';

const personSelect = { select: { id: true, name: true, role: true } } as const;

/** Ce que la carte et les listes affichent d'un signalement : jamais l'e-mail de l'auteur. */
const summarySelect = {
  id: true,
  title: true,
  status: true,
  latitude: true,
  longitude: true,
  address: true,
  photo: true,
  supportCount: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  category: { select: { id: true, slug: true, name: true, color: true, icon: true } },
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.ReportSelect;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly limiter: RateLimiter,
  ) {}

  /** Filtres communs à la carte et aux listes. */
  private where(query: MapQueryDto & { q?: string }): Prisma.ReportWhereInput {
    const where: Prisma.ReportWhereInput = {};
    if (query.bbox !== undefined) {
      const box = parseBbox(query.bbox);
      if (!box) throw new BadRequestException('Zone de carte invalide');
      where.latitude = { gte: box.minLat, lte: box.maxLat };
      where.longitude = { gte: box.minLng, lte: box.maxLng };
    }
    if (query.status?.length) where.status = { in: query.status };
    if (query.category?.length) where.category = { slug: { in: query.category } };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { address: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  /** Points de la carte : champs réduits, 1 000 au plus (au-delà, l'utilisateur zoome). */
  map(query: MapQueryDto) {
    return this.prisma.report.findMany({
      where: this.where(query),
      select: {
        id: true,
        title: true,
        status: true,
        latitude: true,
        longitude: true,
        supportCount: true,
        createdAt: true,
        category: { select: { slug: true, name: true, color: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  }

  async list(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.where(query);
    const orderBy: Prisma.ReportOrderByWithRelationInput[] =
      query.sort === 'supported'
        ? [{ supportCount: 'desc' }, { createdAt: 'desc' }]
        : query.sort === 'oldest'
          ? [{ createdAt: 'asc' }]
          : [{ createdAt: 'desc' }];

    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        select: summarySelect,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async get(id: string, user?: AuthUser) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: {
        ...summarySelect,
        description: true,
        author: personSelect,
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            fromStatus: true,
            toStatus: true,
            message: true,
            createdAt: true,
            actor: personSelect,
          },
        },
      },
    });
    if (!report) throw new NotFoundException('Signalement introuvable');

    const supportedByMe = user
      ? (await this.prisma.support.count({ where: { reportId: id, userId: user.id } })) > 0
      : false;

    const { author, events, ...rest } = report;
    return {
      ...rest,
      author: { id: author.id, name: publicName(author) },
      isMine: user?.id === author.id,
      supportedByMe,
      events: events.map(({ actor, ...event }) => ({
        ...event,
        actor: { name: publicName(actor), role: actor.role },
      })),
    };
  }

  /**
   * Signalements encore ouverts dans un rayon de 75 m : proposés à l'habitant
   * avant qu'il n'envoie le sien, pour qu'il soutienne l'existant plutôt que
   * de créer un doublon.
   */
  async nearby(point: Point, categoryId?: string) {
    const box = boundingBox(point, config.duplicateRadiusMeters);
    const candidates = await this.prisma.report.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
        ...(categoryId ? { categoryId } : {}),
      },
      select: summarySelect,
      take: 50,
    });
    return candidates
      .map((r) => ({ ...r, distance: Math.round(haversineMeters(point, r)) }))
      .filter((r) => r.distance <= config.duplicateRadiusMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }

  async create(user: AuthUser, dto: CreateReportDto, photo?: Express.Multer.File) {
    if (!this.limiter.hit(`report:${user.id}`, config.reportsPerHour, 3_600_000)) {
      throw new HttpException(
        'Vous avez envoyé beaucoup de signalements en une heure. Réessayez un peu plus tard.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const city = config.city;
    if (haversineMeters(city, dto) > city.radiusMeters) {
      throw new BadRequestException(`Ce point est hors du territoire de ${city.name}`);
    }
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Catégorie inconnue');

    // La photo est vérifiée et enregistrée avant la transaction ; si la base
    // échoue ensuite, le fichier orphelin est supprimé.
    const photoName = photo ? await this.uploads.savePhoto(photo.buffer) : null;
    try {
      const report = await this.prisma.$transaction(async (tx) => {
        const created = await tx.report.create({
          data: {
            title: dto.title,
            description: dto.description,
            latitude: dto.latitude,
            longitude: dto.longitude,
            address: dto.address,
            photo: photoName,
            categoryId: category.id,
            authorId: user.id,
            // L'auteur est la première personne concernée.
            supportCount: 1,
            supports: { create: { userId: user.id } },
            events: { create: { type: 'CREATED', toStatus: 'NEW', actorId: user.id } },
          },
          select: { id: true },
        });
        return created;
      });
      return this.get(report.id, user);
    } catch (error) {
      await this.uploads.remove(photoName);
      throw error;
    }
  }

  /** « Moi aussi » — idempotent : soutenir deux fois ne compte qu'une fois. */
  async support(user: AuthUser, id: string) {
    const report = await this.prisma.report.findUnique({ where: { id }, select: { status: true } });
    if (!report) throw new NotFoundException('Signalement introuvable');
    if (!OPEN_STATUSES.includes(report.status)) {
      throw new BadRequestException('Ce signalement est clos');
    }
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.support.createMany({
        data: [{ reportId: id, userId: user.id }],
        skipDuplicates: true,
      });
      const updated = count
        ? await tx.report.update({ where: { id }, data: { supportCount: { increment: 1 } }, select: { supportCount: true } })
        : await tx.report.findUniqueOrThrow({ where: { id }, select: { supportCount: true } });
      return { supportedByMe: true, supportCount: updated.supportCount };
    });
  }

  async unsupport(user: AuthUser, id: string) {
    const report = await this.prisma.report.findUnique({ where: { id }, select: { authorId: true } });
    if (!report) throw new NotFoundException('Signalement introuvable');
    if (report.authorId === user.id) {
      throw new BadRequestException("L'auteur d'un signalement en reste la première personne concernée");
    }
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.support.deleteMany({ where: { reportId: id, userId: user.id } });
      const updated = count
        ? await tx.report.update({ where: { id }, data: { supportCount: { decrement: 1 } }, select: { supportCount: true } })
        : await tx.report.findUniqueOrThrow({ where: { id }, select: { supportCount: true } });
      return { supportedByMe: false, supportCount: updated.supportCount };
    });
  }

  async comment(user: AuthUser, id: string, message: string) {
    if (!this.limiter.hit(`comment:${user.id}`, 20, 600_000)) {
      throw new HttpException('Trop de commentaires en peu de temps. Patientez quelques minutes.', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.ensureExists(id);
    await this.prisma.reportEvent.create({ data: { type: 'COMMENT', message, reportId: id, actorId: user.id } });
    return this.get(id, user);
  }

  /**
   * Fait avancer un signalement. Un agent ne peut agir que sur ce qui lui est
   * attribué ; s'il agit sur un signalement libre, il le prend en charge.
   * Un administrateur peut tout faire.
   */
  async changeStatus(user: AuthUser, id: string, dto: StatusDto) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: { status: true, assigneeId: true },
    });
    if (!report) throw new NotFoundException('Signalement introuvable');

    if (user.role === 'AGENT' && report.assigneeId && report.assigneeId !== user.id) {
      throw new ForbiddenException('Ce signalement est suivi par un autre agent');
    }
    if (report.status === dto.status) {
      throw new BadRequestException('Le signalement a déjà ce statut');
    }
    if (!canTransition(report.status, dto.status)) {
      throw new BadRequestException('Ce changement de statut n’est pas possible');
    }
    if (requiresMessage(dto.status) && !dto.message) {
      throw new BadRequestException(
        dto.status === 'REJECTED'
          ? 'Expliquez à l’habitant pourquoi le signalement est refusé'
          : 'Indiquez ce qui a été fait pour résoudre le problème',
      );
    }

    const takeOver = user.role === 'AGENT' && !report.assigneeId;
    await this.prisma.$transaction(async (tx) => {
      // Mise à jour conditionnelle : si quelqu'un a changé le statut entre la
      // lecture et l'écriture, aucune ligne n'est modifiée et on refuse.
      const { count } = await tx.report.updateMany({
        where: { id, status: report.status },
        data: {
          status: dto.status,
          resolvedAt: dto.status === 'RESOLVED' ? new Date() : null,
          ...(takeOver ? { assigneeId: user.id } : {}),
        },
      });
      if (count === 0) throw new ConflictException('Le statut a changé entre-temps, rechargez la page');

      if (takeOver) {
        await tx.reportEvent.create({ data: { type: 'ASSIGNED', reportId: id, actorId: user.id, message: 'Prise en charge' } });
      }
      await tx.reportEvent.create({
        data: {
          type: 'STATUS_CHANGED',
          fromStatus: report.status,
          toStatus: dto.status,
          message: dto.message,
          reportId: id,
          actorId: user.id,
        },
      });
    });
    return this.get(id, user);
  }

  async assign(user: AuthUser, id: string, assigneeId: string | null | undefined) {
    await this.ensureExists(id);
    let label = 'Attribution retirée';
    if (assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, role: true } });
      if (!assignee || assignee.role === 'CITIZEN') {
        throw new BadRequestException('On ne peut attribuer un signalement qu’à un agent de la ville');
      }
      label = `Attribué à ${assignee.name}`;
    }
    await this.prisma.$transaction([
      this.prisma.report.update({ where: { id }, data: { assigneeId: assigneeId ?? null } }),
      this.prisma.reportEvent.create({ data: { type: 'ASSIGNED', message: label, reportId: id, actorId: user.id } }),
    ]);
    return this.get(id, user);
  }

  /** L'auteur peut retirer son signalement tant que la ville ne l'a pas examiné ; un administrateur, toujours. */
  async remove(user: AuthUser, id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: { authorId: true, status: true, photo: true },
    });
    if (!report) throw new NotFoundException('Signalement introuvable');
    const isAuthor = report.authorId === user.id;
    if (user.role !== 'ADMIN') {
      if (!isAuthor) throw new ForbiddenException('Seul l’auteur peut retirer ce signalement');
      if (report.status !== ReportStatus.NEW) {
        throw new BadRequestException('Ce signalement est déjà pris en compte par la ville et ne peut plus être retiré');
      }
    }
    await this.prisma.report.delete({ where: { id } });
    await this.uploads.remove(report.photo);
  }

  /** Signalements créés par l'habitant, et ceux qu'il a soutenus. */
  async mine(user: AuthUser) {
    const [created, supported] = await Promise.all([
      this.prisma.report.findMany({ where: { authorId: user.id }, select: summarySelect, orderBy: { createdAt: 'desc' } }),
      this.prisma.report.findMany({
        where: { supports: { some: { userId: user.id } }, NOT: { authorId: user.id } },
        select: summarySelect,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return { created, supported };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.report.count({ where: { id } });
    if (!exists) throw new NotFoundException('Signalement introuvable');
  }
}
