import { AuctionsModule } from './modules/auctions/auctions.module';
import { ChitRulesModule } from './modules/rules/chit-rules.module';
import { AuctionDistributionModule } from './modules/auction-rules/auction-distribution.module';
import { MonthCloseModule } from './modules/month-close/month-close.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RecoveryInstallmentModule } from './modules/recovery/recovery-installment.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { CollectionModule } from './modules/collections/collection.module';
import { ReminderModule } from './modules/reminders/reminder.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { AgentCommissionModule } from './modules/agent-commission/agent-commission.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PayoutModule } from './modules/payouts/payout.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DrawsModule } from './modules/draws/draws.module';
import { ChitsModule } from './modules/chits/chits.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { AdminManagementModule } from './modules/admin-management/admin-management.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { EnterpriseHardeningModule } from './common/enterprise-hardening/enterprise-hardening.module';
import { OperationsModule } from './modules/operations/operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    EnterpriseHardeningModule,
    OperationsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AdminManagementModule,
    ChitsModule,
    ParticipantsModule,
    InvitationsModule,
    AuctionsModule,
    NotificationsModule,
    LedgerModule,
    ReconciliationModule,
    CollectionModule,
    DashboardModule,
    ChitRulesModule,
    AuctionDistributionModule,
    MonthCloseModule,
    RecoveryModule,
    RecoveryInstallmentModule,
    ReminderModule,
    AgentCommissionModule,
    PayoutModule,
    PaymentsModule,
    DrawsModule,
  ],
})
export class AppModule {}
