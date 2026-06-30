"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({ origin: '*' });
    const swaggerCfg = new swagger_1.DocumentBuilder()
        .setTitle('VTC API')
        .setDescription('REST API — Application de transport VTC')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    swagger_1.SwaggerModule.setup('api/docs', app, swagger_1.SwaggerModule.createDocument(app, swaggerCfg));
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Server  → http://localhost:${port}/api/v1`);
    console.log(`Swagger → http://localhost:${port}/api/docs`);
    console.log(`Socket  → ws://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map