import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().get('/deployment-check', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'LATEST CODE IS RUNNING',
    commit: 'ec37b10680b84746d2e1ef40b9b028d1e1c5b461',
    timestamp: new Date().toISOString(),
  });
});

  app.getHttpAdapter().get('/api/v1/db-diagnostic', async (_req, res) => {
    const rawUrl = process.env.DATABASE_URL?.trim();
  
    if (!rawUrl) {
      return res.json({
        status: 'error',
        stage: 'configuration',
        databaseUrl: 'missing',
      });
    }
  
    let parsed: URL;
  
    try {
      parsed = new URL(rawUrl);
    } catch {
      return res.json({
        status: 'error',
        stage: 'configuration',
        databaseUrl: 'invalid',
      });
    }
  
    const host = parsed.hostname;
    const port = Number(parsed.port || 5432);
  
    const dns = await import('node:dns/promises');
    const net = await import('node:net');
  
    let dnsResult;
  
    try {
      dnsResult = await dns.lookup(host);
    } catch (error: any) {
      return res.json({
        status: 'error',
        stage: 'dns',
        host,
        port,
        code: error?.code ?? null,
        message: error?.message ?? null,
      });
    }
  
    const tcp = await new Promise<any>((resolve) => {
      const socket = net.createConnection({ host, port });
  
      socket.setTimeout(10000);
  
      socket.once('connect', () => {
        socket.destroy();
        resolve({
          status: 'ok',
        });
      });
  
      socket.once('timeout', () => {
        socket.destroy();
        resolve({
          status: 'failed',
          code: 'ETIMEDOUT',
        });
      });
  
      socket.once('error', (error: any) => {
        socket.destroy();
        resolve({
          status: 'failed',
          code: error?.code ?? null,
          message: error?.message ?? null,
        });
      });
    });
  
    return res.json({
      status: tcp.status === 'ok' ? 'ok' : 'error',
      stage: tcp.status === 'ok' ? 'tcp' : 'tcp',
      target: {
        host,
        port,
        database: parsed.pathname.replace(/^\//, ''),
      },
      dns: {
        status: 'ok',
        address: dnsResult.address,
      },
      tcp,
      timestamp: new Date().toISOString(),
    });
  });

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');

  app.enableVersioning({
    type: 0,
    defaultVersion: process.env.API_VERSION ?? '1',
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
