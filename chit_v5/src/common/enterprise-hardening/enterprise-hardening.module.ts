import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OperationSchedulePolicyService } from './operation-schedule-policy.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [OperationSchedulePolicyService],
  exports: [OperationSchedulePolicyService],
})
export class EnterpriseHardeningModule {}
