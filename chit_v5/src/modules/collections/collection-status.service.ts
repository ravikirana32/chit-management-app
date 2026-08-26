import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class CollectionStatusService {
  constructor(private readonly sequelize: Sequelize) {}

  // Daily job: move unpaid obligations past their due date to OVERDUE.
  async markOverdue() {
    const [rows]: any = await this.sequelize.query(
      `UPDATE contribution_obligations o
       SET status='OVERDUE',updated_at=NOW()
       FROM chit_months m
       JOIN chits c ON c.id=m.chit_id
       WHERE o.chit_month_id=m.id
         AND o.outstanding_amount > 0
         AND o.status IN ('DUE','PARTIAL','PENDING')
         AND m.scheduled_date < CURRENT_DATE
       RETURNING o.id,o.chit_participant_id,o.outstanding_amount,m.chit_id,m.month_number`,
    );
    return rows;
  }

  async markDefaults() {
    // Conservative rule: default only after a configurable grace period.
    const [rows]: any = await this.sequelize.query(
      `UPDATE contribution_obligations o
       SET status='DEFAULTED',updated_at=NOW()
       FROM chit_months m
       JOIN chits c ON c.id=m.chit_id
       WHERE o.chit_month_id=m.id
         AND o.outstanding_amount > 0
         AND o.status='OVERDUE'
         AND m.scheduled_date + (c.collection_grace_days || ' days')::interval < CURRENT_DATE
       RETURNING o.id,o.chit_participant_id,o.outstanding_amount,m.chit_id,m.month_number`,
    );
    return rows;
  }
}
