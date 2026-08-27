import { Controller, Get, Module } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Controller('health')
class HealthController {
  constructor(private readonly sequelize: Sequelize) {}

  @Get()
  async check() {
    try {
      await this.sequelize.authenticate();
      return {
        status: 'ok',
        database: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      // Log the real database error in Render logs, but never return
      // credentials or the full connection string to the client.
      console.error('[HEALTH][DATABASE] connection failed', {
        name: error?.name ?? 'UnknownError',
        code: error?.parent?.code ?? error?.original?.code ?? error?.code ?? null,
        message: String(
          error?.parent?.message ??
            error?.original?.message ??
            error?.message ??
            'Unknown database error',
        )
          .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
          .replace(/password=[^\s&]+/gi, 'password=[REDACTED]'),
      });

      return {
        status: 'error',
        database: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
