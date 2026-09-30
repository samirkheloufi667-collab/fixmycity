import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser, CurrentUser, Public, Roles } from '../common/decorators';
import { config } from '../config';
import { AssignDto, CommentDto, CreateReportDto, ListQueryDto, MapQueryDto, NearbyQueryDto, StatusDto } from './dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Points de la carte. Public : la transparence fait partie du service. */
  @Public()
  @Get('map')
  map(@Query() query: MapQueryDto) {
    return this.reports.map(query);
  }

  @Public()
  @Get()
  list(@Query() query: ListQueryDto) {
    return this.reports.list(query);
  }

  @Public()
  @Get('nearby')
  nearby(@Query() query: NearbyQueryDto) {
    return this.reports.nearby(query, query.categoryId);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.reports.mine(user);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.reports.get(id, user);
  }

  /**
   * Création, en multipart/form-data. Multer garde la photo en mémoire
   * (5 Mo au plus, un seul fichier) : elle n'est écrite sur disque qu'après
   * vérification de son contenu réel.
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: config.maxPhotoBytes, files: 1, fields: 10 },
    }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReportDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.reports.create(user, dto, photo);
  }

  @Post(':id/support')
  @HttpCode(200)
  support(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.support(user, id);
  }

  @Delete(':id/support')
  unsupport(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.unsupport(user, id);
  }

  @Post(':id/comments')
  comment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CommentDto) {
    return this.reports.comment(user, id, dto.message);
  }

  @Patch(':id/status')
  @Roles('AGENT', 'ADMIN')
  status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StatusDto) {
    return this.reports.changeStatus(user, id, dto);
  }

  @Patch(':id/assignee')
  @Roles('ADMIN')
  assign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AssignDto) {
    return this.reports.assign(user, id, dto.assigneeId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reports.remove(user, id);
  }
}
