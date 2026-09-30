import { ReportStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : typeof value === 'string' ? value.trim() : value;

/**
 * Création d'un signalement. Arrive en multipart/form-data (à cause de la
 * photo) : tous les champs sont des chaînes, d'où les conversions explicites.
 */
export class CreateReportDto {
  @Transform(trim)
  @IsString()
  @Length(5, 80, { message: 'Le titre doit faire entre 5 et 80 caractères' })
  title: string;

  @Transform(trim)
  @IsString()
  @Length(10, 1000, { message: 'La description doit faire entre 10 et 1 000 caractères' })
  description: string;

  @IsString()
  @Length(1, 40)
  categoryId: string;

  @Type(() => Number)
  @IsLatitude({ message: 'Latitude invalide' })
  latitude: number;

  @Type(() => Number)
  @IsLongitude({ message: 'Longitude invalide' })
  longitude: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  address?: string;
}

const csv = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : value;

export class MapQueryDto {
  /** Zone visible : « minLng,minLat,maxLng,maxLat ». */
  @IsOptional()
  @IsString()
  bbox?: string;

  @IsOptional()
  @Transform(csv)
  @IsEnum(ReportStatus, { each: true })
  status?: ReportStatus[];

  /** Slugs de catégories. */
  @IsOptional()
  @Transform(csv)
  @IsString({ each: true })
  category?: string[];
}

export class ListQueryDto extends MapQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(['recent', 'supported', 'oldest'])
  sort?: 'recent' | 'supported' | 'oldest';

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

export class NearbyQueryDto {
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class CommentDto {
  @Transform(trim)
  @IsString()
  @Length(1, 1000, { message: 'Le commentaire doit faire entre 1 et 1 000 caractères' })
  message: string;
}

export class StatusDto {
  @IsEnum(ReportStatus, { message: 'Statut inconnu' })
  status: ReportStatus;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class AssignDto {
  /** null pour retirer l'attribution. */
  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}
