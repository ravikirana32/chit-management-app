import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

const CLOSED = new Set(['LOCKED','CLOSED','CANCELLED']);

@Injectable()
export class MonthCloseService {
  constructor(private readonly sequelize: Sequelize) {}

  private async assertManageAccess(chitId: string, userId: string, transaction: any) {
    const [access]: any = await this.sequelize.query(
      `SELECT 1 FROM chits c WHERE c.id=:chitId AND c.creator_id=:userId LIMIT 1`,
      { replacements: { chitId, userId }, transaction },
    );
    const [admin]: any = await this.sequelize.query(
      `SELECT 1 FROM user_roles WHERE user_id=:userId AND role='ADMIN' LIMIT 1`,
      { replacements: { userId }, transaction },
    );
    const [agent]: any = await this.sequelize.query(
      `SELECT 1 FROM chit_agent_assignments ca
       JOIN agents ag ON ag.id=ca.agent_id AND ag.user_id=:userId AND ag.status='ACTIVE'
       WHERE ca.chit_id=:chitId AND ca.active=true AND ca.can_manage_chit=true LIMIT 1`,
      { replacements: { chitId, userId }, transaction },
    );
    if (!access.length && !admin.length && !agent.length) {
      throw new ConflictException('Month close permission is required for this chit');
    }
  }

  async resumeCollections(monthId: string, userId: string) {
    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT m.*,c.creator_id,c.status AS chit_status
         FROM chit_months m JOIN chits c ON c.id=m.chit_id
         WHERE m.id=:monthId FOR UPDATE OF m`,
        { replacements: { monthId }, transaction },
      );
      if (!rows.length) throw new NotFoundException('Month not found');
      const m = rows[0];
      await this.assertManageAccess(m.chit_id, userId, transaction);

      const status = String(m.status || '').toUpperCase();
      const historical = String(m.data_origin || '').toUpperCase() === 'HISTORICAL';
      if (historical) throw new ConflictException('Historical months are permanently locked and cannot be resumed');
      if (status !== 'COMPLETED') throw new ConflictException(`Only a COMPLETED month can be resumed. Current status: ${status || 'UNKNOWN'}`);

      const [open]: any = await this.sequelize.query(
        `SELECT COUNT(*)::int AS count
         FROM contribution_obligations
         WHERE chit_month_id=:monthId
           AND status IN ('DUE','PENDING','PARTIAL','OVERDUE','RECOVERY_PLAN')`,
        { replacements: { monthId }, transaction },
      );
      if (Number(open[0]?.count || 0) === 0) {
        throw new ConflictException('This month has no unresolved contribution obligations; resume is not required');
      }

      await this.sequelize.query(
        `UPDATE chit_months SET status='COLLECTION',updated_at=NOW() WHERE id=:monthId`,
        { replacements: { monthId }, transaction },
      );
      await this.sequelize.query(
        `INSERT INTO audit_logs(id,actor_user_id,chit_id,action,entity_type,entity_id,after_data,created_at,updated_at)
         VALUES(gen_random_uuid(),:actor,:chitId,'MONTH_COLLECTION_RESUMED','CHIT_MONTH',:monthId,:data,NOW(),NOW())`,
        { replacements: { actor: userId, chitId: m.chit_id, monthId, data: JSON.stringify({ previousStatus: status, reason: 'Unresolved contributions after draw/auction completion' }) }, transaction },
      );

      return {
        success: true,
        data: { ...m, status: 'COLLECTION' },
        message: 'Monthly collections resumed. Verify all member contributions before settling and locking the month.',
      };
    });
  }

  async close(monthId: string, userId: string) {
    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT m.*,c.creator_id FROM chit_months m JOIN chits c ON c.id=m.chit_id WHERE m.id=:monthId FOR UPDATE OF m`,
        { replacements: { monthId }, transaction },
      );
      if (!rows.length) throw new NotFoundException('Month not found');
      const m = rows[0];
      await this.assertManageAccess(m.chit_id, userId, transaction);

      const status = String(m.status || '').toUpperCase();
      if (status === 'LOCKED') return m;
      if (CLOSED.has(status)) throw new ConflictException(`Month is already ${status} and cannot be changed`);
      if (!['COMPLETED','COLLECTION'].includes(status)) throw new ConflictException(`Month must be COMPLETED or COLLECTION before it can be locked. Current status: ${status || 'UNKNOWN'}`);

      const [open]: any = await this.sequelize.query(
        `SELECT COUNT(*)::int AS count FROM contribution_obligations
         WHERE chit_month_id=:monthId AND status IN ('DUE','PENDING','PARTIAL','OVERDUE','RECOVERY_PLAN')`,
        { replacements: { monthId }, transaction },
      );
      if (Number(open[0].count) > 0) throw new ConflictException(`Cannot lock month with ${Number(open[0].count)} unresolved contribution obligation(s)`);

      await this.sequelize.query(
        `UPDATE payouts stale SET status='FAILED',paid_at=NULL,
         notes=CONCAT(COALESCE(stale.notes,''),' | SUPERSEDED_BY_SETTLED_PAYOUT:',settled.id),updated_at=NOW()
         FROM payouts settled JOIN chit_months sm ON sm.id=settled.chit_month_id LEFT JOIN agents sa ON sa.id=sm.agent_id
         WHERE stale.chit_month_id=:monthId AND stale.status='PENDING' AND stale.id<>settled.id
           AND sm.month_type='AGENT_CHIT' AND settled.status='SETTLED'
           AND (stale.notes LIKE 'AGENT_CHIT:%' OR (sm.agent_id IS NOT NULL AND stale.recipient_agent_id=sm.agent_id) OR (sa.user_id IS NOT NULL AND stale.recipient_user_id=sa.user_id))
           AND (settled.notes LIKE 'AGENT_CHIT:%' OR (sm.agent_id IS NOT NULL AND settled.recipient_agent_id=sm.agent_id) OR (sa.user_id IS NOT NULL AND settled.recipient_user_id=sa.user_id))`,
        { replacements: { monthId }, transaction },
      );

      const [payout]: any = await this.sequelize.query(
        `SELECT COUNT(*)::int AS count FROM payouts WHERE chit_month_id=:monthId AND status='PENDING'`,
        { replacements: { monthId }, transaction },
      );
      if (Number(payout[0].count) > 0) throw new ConflictException(`Cannot lock month with ${Number(payout[0].count)} pending payout(s). Settle the payout first.`);

      const [updated]: any = await this.sequelize.query(
        `UPDATE chit_months SET status='LOCKED',locked_at=NOW(),locked_by=:userId,updated_at=NOW() WHERE id=:monthId RETURNING *`,
        { replacements: { monthId, userId }, transaction },
      );
      return { success: true, data: updated[0], message: 'Month finalized and locked successfully' };
    });
  }
}
