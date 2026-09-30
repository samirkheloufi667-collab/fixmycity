import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { config } from '../config';
import { OPEN_STATUSES } from '../reports/status';
import { PrismaService } from '../prisma/prisma.service';

/** Données publiques de référence : catégories, territoire et chiffres clés. */
@Controller()
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('categories')
  categories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  @Public()
  @Get('city')
  city() {
    const { name, latitude, longitude, radiusMeters, zoom } = config.city;
    return { name, latitude, longitude, radiusMeters, zoom };
  }

  /** Chiffres de la page d'accueil. */
  @Public()
  @Get('stats')
  async stats() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, resolved, open, resolvedThisMonth, citizens, durations] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: 'RESOLVED' } }),
      this.prisma.report.count({ where: { status: { in: OPEN_STATUSES } } }),
      this.prisma.report.count({ where: { status: 'RESOLVED', resolvedAt: { gte: monthStart } } }),
      this.prisma.user.count({ where: { role: 'CITIZEN' } }),
      this.prisma.report.findMany({
        where: { status: 'RESOLVED', resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        orderBy: { resolvedAt: 'desc' },
        take: 500,
      }),
    ]);
    const days = durations.map((r) => (r.resolvedAt!.getTime() - r.createdAt.getTime()) / 86_400_000);
    return { total, resolved, open, resolvedThisMonth, citizens, medianResolutionDays: median(days) };
  }
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 10) / 10;
}
