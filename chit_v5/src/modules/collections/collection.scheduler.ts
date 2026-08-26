import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CollectionStatusService } from './collection-status.service';

@Injectable()
export class CollectionScheduler {
  private readonly logger = new Logger(CollectionScheduler.name);

  constructor(private readonly status: CollectionStatusService) {}

  @Cron('0 5 0 * * *')
  async dailyStatusUpdate() {
    const overdue = await this.status.markOverdue();
    const defaults = await this.status.markDefaults();
    this.logger.log(`Collection status update: ${overdue.length} overdue, ${defaults.length} defaulted`);
  }
}
