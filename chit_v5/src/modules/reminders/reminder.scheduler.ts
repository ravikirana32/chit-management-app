import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReminderService } from './reminder.service';

@Injectable()
export class ReminderScheduler {
  private readonly logger=new Logger(ReminderScheduler.name);
  constructor(private readonly reminders:ReminderService){}

  @Cron('0 0 9 * * *')
  async dailyReminders() {
    const result=await this.reminders.createForOutstanding();
    this.logger.log(`Created ${result.created} payment reminders`);
  }
}
