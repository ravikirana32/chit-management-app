import { Module } from '@nestjs/common';
import { RecoveryInstallmentService } from './recovery-installment.service';
@Module({providers:[RecoveryInstallmentService],exports:[RecoveryInstallmentService]})
export class RecoveryInstallmentModule {}
