import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class MemberDrawInterestService {
  constructor(private readonly db: Sequelize) {}

  async excludeHistoricalWinners(chitId: string, monthId: string, transaction?: any) {
    // Historical running-chit winners are stored in chit_months.historical_data,
    // not in draw_winners/auction_winners. Mark them excluded in the live draw
    // so they cannot express interest or be selected again.
    const [rows]: any = await this.db.query(
      `SELECT cp.id
       FROM chit_participants cp
       WHERE cp.chit_id=:chitId
         AND cp.status='ACTIVE'
         AND cp.user_id IN (
           SELECT DISTINCT (hm.historical_data->>'winnerMemberId')
           FROM chit_months hm
           WHERE hm.chit_id=:chitId
             AND hm.id<>:monthId
             AND UPPER(COALESCE(hm.data_origin,''))='HISTORICAL'
             AND hm.historical_data->>'winnerMemberId' IS NOT NULL
         )`,
      { replacements: { chitId, monthId }, transaction },
    );

    if (!rows.length) return;

    await this.db.query(
      `UPDATE draw_participants dp
       SET eligibility_status='EXCLUDED',
           exclusion_reason='PREVIOUS_WINNER',
           updated_at=NOW()
       FROM draws d
       WHERE dp.draw_id=d.id
         AND d.chit_id=:chitId
         AND d.chit_month_id=:monthId
         AND dp.chit_participant_id IN (:participantIds)
         AND dp.eligibility_status='ELIGIBLE'`,
      { replacements: { chitId, monthId, participantIds: rows.map((r: any) => r.id) }, transaction },
    );
  }

  async setInterest(chitId: string, monthId: string, actorUserId: string, interested: boolean) {
    return this.db.transaction(async transaction => {
      // Lock the month first so two members cannot create two draw records concurrently.
      const [months]: any = await this.db.query(
        `SELECT m.*, c.creator_id, c.status AS chit_status, c.chit_type
         FROM chit_months m
         JOIN chits c ON c.id=m.chit_id
         WHERE m.id=:monthId AND m.chit_id=:chitId
         FOR UPDATE OF m,c`,
        { replacements: { chitId, monthId }, transaction },
      );
      if (!months.length) throw new NotFoundException('Chit month not found');
      const month = months[0];

      if (month.chit_type !== 'FIXED_DRAW')
        throw new BadRequestException('This endpoint is only for FIXED_DRAW chits');
      if (month.month_type === 'AGENT_CHIT')
        throw new BadRequestException('AGENT_CHIT month does not have a draw');
      if (String(month.chit_status).toUpperCase() !== 'ACTIVE')
        throw new ConflictException('Chit is not active');
      if (!['SCHEDULED', 'READY_FOR_ACTION', 'COLLECTION'].includes(String(month.status).toUpperCase()))
        throw new ConflictException('This month is not available for interest');

      const [memberRows]: any = await this.db.query(
        `SELECT cp.id, cp.participant_sequence
         FROM chit_participants cp
         WHERE cp.chit_id=:chitId AND cp.user_id=:userId AND cp.status='ACTIVE'
         LIMIT 1`,
        { replacements: { chitId, userId: actorUserId }, transaction },
      );
      if (!memberRows.length)
        throw new ConflictException('Participant is not eligible for this draw or does not belong to authenticated user');
      const member = memberRows[0];

      let [drawRows]: any = await this.db.query(
        `SELECT * FROM draws WHERE chit_month_id=:monthId FOR UPDATE`,
        { replacements: { monthId }, transaction },
      );

      if (!drawRows.length) {
        const [eligible]: any = await this.db.query(
          `SELECT cp.id, cp.participant_sequence
           FROM chit_participants cp
           WHERE cp.chit_id=:chitId
             AND cp.status='ACTIVE'
             AND NOT EXISTS (
               SELECT 1 FROM draw_winners dw
               JOIN draws d ON d.id=dw.draw_id
               WHERE dw.chit_participant_id=cp.id AND d.chit_id=:chitId
             )
             AND NOT EXISTS (
               SELECT 1 FROM auction_winners aw
               JOIN auctions a ON a.id=aw.auction_id
               WHERE aw.chit_participant_id=cp.id AND a.chit_id=:chitId
             )
             AND NOT EXISTS (
               SELECT 1 FROM contribution_obligations o
               JOIN chit_months om ON om.id=o.chit_month_id
               WHERE o.chit_participant_id=cp.id
                 AND om.chit_id=:chitId
                 AND o.status IN ('OVERDUE','DEFAULTED','DISPUTED')
             )
           ORDER BY cp.participant_sequence
           FOR UPDATE OF cp`,
          { replacements: { chitId }, transaction },
        );
        if (!eligible.length) throw new BadRequestException('No eligible participants remain');

        const opens = new Date();
        const [created]: any = await this.db.query(
          `INSERT INTO draws
           (id,chit_id,chit_month_id,status,selection_method,scheduled_at,started_at,
            executed_by,rules_snapshot,idempotency_key,created_at,updated_at)
           VALUES
           (gen_random_uuid(),:chitId,:monthId,'IN_PROGRESS','RANDOM',:opens,:opens,
            :actor,:rules,CONCAT('draw:',:monthId),NOW(),NOW())
           RETURNING *`,
          {
            replacements: {
              chitId, monthId, opens, actor: actorUserId,
              rules: JSON.stringify({
                winnerCount: 1,
                previousWinnerExcluded: true,
                defaultToAllEligibleWhenNoInterest: true,
                interestWindow: true,
                fixedDraw: true,
                autoOpenedByMemberInterest: true,
                randomSource: 'node:crypto.randomInt',
              }),
            },
            transaction,
          },
        );
        drawRows = created;

        for (const p of eligible) {
          await this.db.query(
            `INSERT INTO draw_participants
             (id,draw_id,chit_participant_id,eligibility_status,participant_sequence,
              interest_status,created_at,updated_at)
             VALUES
             (gen_random_uuid(),:drawId,:pid,'ELIGIBLE',:seq,'NO_RESPONSE',NOW(),NOW())`,
            { replacements: { drawId: drawRows[0].id, pid: p.id, seq: p.participant_sequence }, transaction },
          );
        }

        await this.db.query(
          `UPDATE chit_months
           SET draw_interest_opens_at=:opens,
               draw_interest_closes_at=NULL,
               draw_at=:opens,
               status='READY_FOR_ACTION',
               updated_at=NOW()
           WHERE id=:monthId`,
          { replacements: { monthId, opens }, transaction },
        );
      }

      const draw = drawRows[0];
      await this.excludeHistoricalWinners(chitId, monthId, transaction);
      if (String(draw.status).toUpperCase() === 'COMPLETED')
        throw new ConflictException('Draw is already completed');

      const [participantRows]: any = await this.db.query(
        `SELECT dp.id,dp.draw_id,dp.interest_status,dp.interest_at
         FROM draw_participants dp
         WHERE dp.draw_id=:drawId AND dp.chit_participant_id=:participantId
           AND dp.eligibility_status='ELIGIBLE'
         FOR UPDATE`,
        { replacements: { drawId: draw.id, participantId: member.id }, transaction },
      );
      if (!participantRows.length)
        throw new ConflictException('Participant is not eligible for this draw');

      await this.db.query(
        `UPDATE draw_participants
         SET interest_status=:status, interest_at=NOW(), updated_at=NOW()
         WHERE id=:id`,
        { replacements: { id: participantRows[0].id, status: interested ? 'INTERESTED' : 'NOT_INTERESTED' }, transaction },
      );

      return {
        success: true,
        drawId: draw.id,
        monthId,
        interestStatus: interested ? 'INTERESTED' : 'NOT_INTERESTED',
        interestWindowOpened: true,
      };
    });
  }
}
