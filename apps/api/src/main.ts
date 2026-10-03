import './env';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { config } from './config';

export function configure(app: import('@nestjs/common').INestApplication) {
  app.setGlobalPrefix('api');
  // Derrière le proxy de l'hébergeur, l'adresse IP réelle est dans X-Forwarded-For (limiteur de débit).
  if (config.production) app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(
    helmet({
      // En développement, l'interface est servie depuis une autre origine et affiche les photos de l'API.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Les serveurs de tuiles d'OpenStreetMap exigent un en-tête Referer : sans lui,
      // ils renvoient une image « 403 Access blocked » à la place de la carte.
      // On n'envoie que l'origine du site (jamais l'adresse de la page) aux autres domaines.
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: {
        directives: {
          // Tuiles de la carte OpenStreetMap ; tout le reste vient de la même origine.
          'img-src': ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org'],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  // Production : l'API sert aussi l'interface compilée (application monopage).
  const webDist = process.env.WEB_DIST;
  if (webDist) {
    // Les fichiers de /assets ont une empreinte dans leur nom (Vite) : gardés un an.
    app.use('/assets', express.static(join(webDist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(webDist, 'index.html'));
    });
  }
  app.use(cookieParser());
  app.enableCors({ origin: config.webOrigin, credentials: true });
  // whitelist : tout champ non déclaré dans un DTO est rejeté, ce qui empêche
  // par exemple d'envoyer { "role": "ADMIN" } dans une requête qui ne l'attend pas.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
  return app;
}

async function bootstrap() {
  const app = configure(await NestFactory.create(AppModule));
  await app.listen(config.port);
  new Logger('FixMyCity').log(`API prête sur http://localhost:${config.port}/api`);
}

if (require.main === module) {
  void bootstrap();
}
