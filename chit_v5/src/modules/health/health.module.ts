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
    } catch {
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
