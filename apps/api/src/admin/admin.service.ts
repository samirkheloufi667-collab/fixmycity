import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportStatus, Role } from '@prisma/client';
import { median } from '../categories/categories.controller';
import { AuthUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { OPEN_STATUSES } from '../reports/status';
import { QueueQueryDto } from './dto';

const DAY = 86_400_000;

/** Lundi 00:00 de la semaine qui contient `date`. */
export function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tableau de bord des services de la ville. */
  async stats() {
    const since = weekStart(new Date(Date.now() - 7 * 7 * DAY));
    const [byStatus, byCategory, categories, recent, resolved, oldestOpen, workload] = await Promise.all([
      this.prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.report.groupBy({
        by: ['categoryId'],
        where: { status: { in: OPEN_STATUSES } },
        _count: { _all: true },
      }),
      this.prisma.category.findMany({ select: { id: true, name: true, color: true, slug: true } }),
      this.prisma.report.findMany({
        where: { OR: [{ createdAt: { gte: since } }, { resolvedAt: { gte: since } }] },
        select: { createdAt: true, resolvedAt: true },
      }),
      this.prisma.report.findMany({
        where: { status: 'RESOLVED', resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        orderBy: { resolvedAt: 'desc' },
        take: 500,
      }),
      this.prisma.report.findMany({
        where: { status: { in: OPEN_STATUSES } },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          supportCount: true,
          category: { select: { name: true, color: true } },
          assignee: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      }),
      this.prisma.user.findMany({
        where: { role: { in: ['AGENT', 'ADMIN'] } },
        select: {
          id: true,
          name: true,
          role: true,
          _count: { select: { assigned: { where: { status: { in: OPEN_STATUSES } } } } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Huit semaines : signalements reçus et résolus, pour voir si la ville suit le rythme.
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(since.getTime() + i * 7 * DAY);
      return { start: start.toISOString(), created: 0, resolved: 0 };
    });
    const indexOf = (d: Date) => Math.floor((weekStart(d).getTime() - since.getTime()) / (7 * DAY));
    for (const r of recent) {
      const c = indexOf(r.createdAt);
      if (c >= 0 && c < 8) weeks[c].created += 1;
      if (r.resolvedAt) {
        const s = indexOf(r.resolvedAt);
        if (s >= 0 && s < 8) weeks[s].resolved += 1;
      }
    }

    const counts = Object.fromEntries(
      (['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as ReportStatus[]).map((s) => [s, 0]),
    ) as Record<ReportStatus, number>;
    byStatus.forEach((g) => (counts[g.status] = g._count._all));

    const openByCategory = categories
      .map((c) => ({ ...c, open: byCategory.find((g) => g.categoryId === c.id)?._count._all ?? 0 }))
      .sort((a, b) => b.open - a.open);

    const durations = resolved.map((r) => (r.resolvedAt!.getTime() - r.createdAt.getTime()) / DAY);

    return {
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      open: OPEN_STATUSES.reduce((sum, s) => sum + counts[s], 0),
      medianResolutionDays: median(durations),
      weeks,
      openByCategory,
      oldestOpen,
      workload: workload.map(({ _count, ...agent }) => ({ ...agent, open: _count.assigned })),
    };
  }

  /** File de traitement : filtre par statut, catégorie et responsable. */
  async queue(user: AuthUser, query: QueueQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ReportWhereInput = {};
    if (query.status?.length) where.status = { in: query.status };
    if (query.category?.length) where.category = { slug: { in: query.category } };
    if (query.assignee === 'me') where.assigneeId = user.id;
    else if (query.assignee === 'none') where.assigneeId = null;
    else if (query.assignee) where.assigneeId = query.assignee;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { address: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const orderBy: Prisma.ReportOrderByWithRelationInput[] =
      query.sort === 'newest'
        ? [{ createdAt: 'desc' }]
        : query.sort === 'supported'
          ? [{ supportCount: 'desc' }, { createdAt: 'asc' }]
          : [{ createdAt: 'asc' }];

    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          status: true,
          address: true,
          supportCount: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { name: true, color: true, icon: true, slug: true } },
          assignee: { select: { id: true, name: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  agents() {
    return this.prisma.user.findMany({
      where: { role: { in: ['AGENT', 'ADMIN'] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  users(q?: string) {
    return this.prisma.user.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { reports: true } },
      },
      orderBy: [{ role: 'desc' }, { name: 'asc' }],
      take: 100,
    });
  }

  /** Un administrateur ne change pas son propre rôle : la ville garde toujours au moins un administrateur. */
  async setRole(admin: AuthUser, userId: string, role: Role) {
    if (admin.id === userId) {
      throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, name: true, email: true, role: true },
      });
      // Un habitant ne peut pas rester responsable d'un signalement.
      if (role === 'CITIZEN') {
        await tx.report.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } });
      }
      return updated;
    });
  }
}
