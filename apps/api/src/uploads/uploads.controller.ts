import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import { Public } from '../common/decorators';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /**
   * Sert une photo. Le nom est validé par une expression stricte avant de
   * toucher au disque : impossible de remonter l'arborescence avec « ../ ».
   */
  @Public()
  @Get(':name')
  photo(@Param('name') name: string, @Res() res: Response) {
    const path = this.uploads.pathOf(name);
    if (!path || !existsSync(path)) throw new NotFoundException('Photo introuvable');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // L'interface est servie depuis une autre origine que l'API.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.type(name.endsWith('.png') ? 'image/png' : 'image/jpeg');
    res.sendFile(path);
  }
}
