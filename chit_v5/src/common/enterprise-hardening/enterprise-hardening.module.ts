import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../../modules/auth/auth.module';
import { OperationSchedulePolicyService } from './operation-schedule-policy.service';
import { WinnerRevealGateway } from './winner-reveal.gateway';
import { WinnerRevealService } from './winner-reveal.service';

@Global()
@Module({
  imports: [ConfigModule, AuthModule],
  providers: [OperationSchedulePolicyService, WinnerRevealGateway, WinnerRevealService],
  exports: [OperationSchedulePolicyService, WinnerRevealService],
})
export class EnterpriseHardeningModule {}
