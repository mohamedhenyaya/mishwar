// Dates en UTC côté Node : les colonnes « timestamp » sans fuseau sont écrites et relues en UTC,
// et comparées en SQL à timezone('UTC', now()), quel que soit le fuseau du PC ou de la base
process.env.TZ = 'UTC';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { UPLOADS_DIR } from './common/utils/photo-upload.util';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { prepareVehiclesOneToOne } from './database/vehicles-one-to-one';

// Messages par défaut de class-validator (en anglais) remplacés pour les cas vus par les utilisateurs
const VALIDATION_MESSAGES: Record<string, string> = {
  isPhoneNumber: 'Numéro de téléphone invalide',
};

function validationMessage(errors: ValidationError[]): string {
  const messages = errors.flatMap(function collect(error: ValidationError): string[] {
    const own = Object.entries(error.constraints ?? {}).map(([rule, message]) => VALIDATION_MESSAGES[rule] ?? message);
    return [...own, ...(error.children ?? []).flatMap(collect)];
  });
  return [...new Set(messages)].join('\n');
}

async function bootstrap() {
  // Avant NestFactory.create : le synchronize de TypeORM a lieu pendant la création
  await prepareVehiclesOneToOne();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Préfixe global : /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Pièces d'identité et documents du véhicule : jamais en accès public (voir DOCUMENTS_DIR)
  app.use('/uploads/private', (_req: unknown, res: { status: (code: number) => { end: () => void } }) => res.status(404).end());

  // Photos de profil : http://<host>:3000/uploads/<fichier>
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });

  // Validation automatique de tous les DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // Un seul message lisible (les apps l'affichent tel quel dans une alerte)
      exceptionFactory: (errors) => new BadRequestException(validationMessage(errors)),
    }),
  );

  // CORS — restreindre aux domaines connus en production
  app.enableCors({ origin: '*' });

  // Swagger UI — disponible sur /api/docs
  const swaggerCfg = new DocumentBuilder()
    .setTitle('VTC API')
    .setDescription('REST API — Application de transport VTC')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerCfg));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Server  → http://localhost:${port}/api/v1`);
  console.log(`Swagger → http://localhost:${port}/api/docs`);
  console.log(`Socket  → ws://localhost:${port}`);
}
bootstrap();