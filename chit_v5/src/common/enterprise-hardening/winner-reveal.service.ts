import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { Sequelize } from 'sequelize-typescript';
import { WinnerRevealGateway } from './winner-reveal.gateway';

@Injectable()
export class WinnerRevealService {
  private readonly durationSeconds: number;

  constructor(
    private readonly db: Sequelize,
    private readonly config: ConfigService,
    private readonly gateway: WinnerRevealGateway,
  ) {
    const configured = Number(this.config.get<string>('WINNER_REVEAL_SECONDS', '40'));
    this.durationSeconds = Math.min(45, Math.max(30, Number.isFinite(configured) ? configured : 40));
  }

  getDurationSeconds() { return this.durationSeconds; }

  async start(kind: 'DRAW'|'AUCTION', id: string, transaction?: any) {
    const table = kind === 'DRAW' ? 'draws' : 'auctions';
    const now = new Date();
    const ends = new Date(now.getTime() + this.durationSeconds * 1000);
    const [rows]: any = await this.db.query(
      `UPDATE ${table}
       SET reveal_status='REVEALING', reveal_started_at=:started, reveal_ends_at=:ends,
           winner_revealed_at=NULL, reveal_duration_seconds=:duration, updated_at=NOW()
       WHERE id=:id AND reveal_status IN ('NONE','REVEALED')
       RETURNING id,reveal_status,reveal_started_at,reveal_ends_at,reveal_duration_seconds`,
      { replacements: { id, started: now, ends, duration: this.durationSeconds }, transaction },
    );
    if (!rows.length) {
      const [current]: any = await this.db.query(
        `SELECT id,reveal_status,reveal_started_at,reveal_ends_at,reveal_duration_seconds FROM ${table} WHERE id=:id`,
        { replacements: { id }, transaction },
      );
      return current[0] ?? null;
    }
    const state = rows[0];
    return state;
  }

  async get(kind: 'DRAW'|'AUCTION', id: string) {
    const table = kind === 'DRAW' ? 'draws' : 'auctions';
    const [rows]: any = await this.db.query(
      `SELECT id,reveal_status,reveal_started_at,reveal_ends_at,winner_revealed_at,reveal_duration_seconds
       FROM ${table} WHERE id=:id`,
      { replacements: { id } },
    );
    return rows[0] ?? null;
  }

  @Interval(1000)
  async revealDue() {
    for (const [kind, table] of [['DRAW','draws'], ['AUCTION','auctions'] as const] as any[]) {
      const [rows]: any = await this.db.query(
        `UPDATE ${table}
         SET reveal_status='REVEALED', winner_revealed_at=NOW(), updated_at=NOW()
         WHERE reveal_status='REVEALING' AND reveal_ends_at IS NOT NULL AND reveal_ends_at <= NOW()
         RETURNING id`,
      );
      for (const row of rows) {
        const winnerTable = kind === 'DRAW' ? 'draw_winners' : 'auction_winners';
        const [winner]: any = await this.db.query(
          `SELECT ${kind === 'DRAW' ? 'dw.id,dw.chit_participant_id,cp.participant_sequence,u.name AS member_name,u.mobile_number AS member_mobile' : 'aw.id,aw.chit_participant_id,cp.participant_sequence,u.name AS member_name,u.mobile_number AS member_mobile,aw.winning_bid_amount'}
           FROM ${winnerTable} ${kind === 'DRAW' ? 'dw' : 'aw'}
           JOIN chit_participants cp ON cp.id=${kind === 'DRAW' ? 'dw' : 'aw'}.chit_participant_id
           JOIN users u ON u.id=cp.user_id
           WHERE ${kind === 'DRAW' ? 'dw.draw_id' : 'aw.auction_id'}=:id LIMIT 1`,
          { replacements: { id: row.id } },
        );
        this.gateway.emitRevealed(kind, row.id, { winner: winner[0] ?? null });
      }
    }
  }
}
