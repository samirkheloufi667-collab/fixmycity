import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    PrismaModule,
    CommonModule,
    UploadsModule,
    AuthModule,
    CategoriesModule,
    ReportsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordre important : on identifie d'abord l'utilisateur, puis on vérifie son rôle.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
