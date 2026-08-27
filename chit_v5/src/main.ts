import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');

  app.enableVersioning({
    type: 0,
    defaultVersion: process.env.API_VERSION ?? 'v1',
  });

  app.use((req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] ?? randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Chit Management API')
      .setDescription(
        'API for fixed draw chits, auction chits, payments, payouts and ledgers',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Health')
      .addTag('Authentication')
      .addTag('Users')
      .addTag('Chits')
      .addTag('Chit Months')
      .addTag('Participants')
      .addTag('Invitations')
      .addTag('Payments')
      .addTag('Draws')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
