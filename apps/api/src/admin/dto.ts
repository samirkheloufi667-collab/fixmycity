import { ReportStatus, Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const csv = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : value;

export class QueueQueryDto {
  @IsOptional()
  @Transform(csv)
  @IsEnum(ReportStatus, { each: true })
  status?: ReportStatus[];

  @IsOptional()
  @Transform(csv)
  @IsString({ each: true })
  category?: string[];

  /** « me », « none » ou l'identifiant d'un agent. */
  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(['oldest', 'newest', 'supported'])
  sort?: 'oldest' | 'newest' | 'supported';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class RoleDto {
  @IsEnum(Role, { message: 'Rôle inconnu' })
  role: Role;
}

export class UsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}
