import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config';
import { detectImageType, stripMetadata } from './image';

/** Nom de fichier produit par le serveur : un UUID et une extension connue, rien d'autre. */
export const PHOTO_NAME = /^[0-9a-f-]{36}\.(jpg|png)$/;

@Injectable()
export class UploadsService implements OnModuleInit {
  async onModuleInit() {
    await mkdir(config.uploadDir, { recursive: true });
  }

  /**
   * Vérifie, nettoie et enregistre une photo. Le nom d'origine envoyé par le
   * navigateur est ignoré : il pourrait contenir « ../ » ou un nom réservé.
   */
  async savePhoto(buffer: Buffer): Promise<string> {
    if (buffer.length > config.maxPhotoBytes) {
      throw new BadRequestException('Photo trop lourde (5 Mo maximum)');
    }
    const type = detectImageType(buffer);
    if (!type) {
      throw new BadRequestException('Format de photo non pris en charge : JPEG ou PNG uniquement');
    }
    let clean: Buffer;
    try {
      clean = stripMetadata(buffer, type);
    } catch {
      throw new BadRequestException('Fichier image illisible ou corrompu');
    }
    const name = `${randomUUID()}.${type === 'jpeg' ? 'jpg' : 'png'}`;
    await writeFile(join(config.uploadDir, name), clean);
    return name;
  }

  pathOf(name: string): string | null {
    return PHOTO_NAME.test(name) ? join(config.uploadDir, name) : null;
  }

  async remove(name: string | null | undefined): Promise<void> {
    const path = name ? this.pathOf(name) : null;
    if (path) await rm(path, { force: true });
  }
}
