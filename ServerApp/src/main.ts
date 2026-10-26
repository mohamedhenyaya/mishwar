import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { UPLOADS_DIR } from './common/utils/photo-upload.util';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Préfixe global : /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Photos de profil : http://<host>:3000/uploads/<fichier>
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });

  // Validation automatique de tous les DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
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