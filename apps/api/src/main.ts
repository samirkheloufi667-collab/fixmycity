import './env';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { config } from './config';

export function configure(app: import('@nestjs/common').INestApplication) {
  app.setGlobalPrefix('api');
  // Les photos sont affichées par l'interface, servie depuis une autre origine.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
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
