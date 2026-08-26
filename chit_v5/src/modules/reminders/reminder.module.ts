import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderScheduler } from './reminder.scheduler';

@Module({
  providers:[ReminderService,ReminderScheduler],
  exports:[ReminderService],
})
export class ReminderModule {}
