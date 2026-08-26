import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller({ path: 'health', version: 'v1' })
class HealthController {
  @Get()
  getHealth() {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'chit-app-api',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
