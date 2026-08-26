import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Sequelize } from 'sequelize-typescript';
import { AuctionGateway } from './auction.gateway';

@Injectable()
export class AuctionAutoCloseService {
  private readonly logger = new Logger(AuctionAutoCloseService.name);

  constructor(
    private readonly sequelize: Sequelize,
    private readonly gateway: AuctionGateway,
  ) {}

  // Runs once per minute. Finalization remains idempotent at DB level.
  @Cron('0 * * * * *')
  async closeExpiredAuctions() {
    const [auctions]: any = await this.sequelize.query(
      `SELECT id FROM auctions
       WHERE status='OPEN' AND closes_at <= NOW()
       ORDER BY closes_at
       LIMIT 100`,
    );

    for (const auction of auctions) {
      try {
        await this.closeOne(auction.id);
      } catch (error) {
        this.logger.error(`Unable to auto-close auction ${auction.id}`, error as any);
      }
    }
  }

  private async closeOne(auctionId: string) {
    await this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT a.*,m.scheduled_amount,m.chit_id
         FROM auctions a
         JOIN chit_months m ON m.id=a.chit_month_id
         WHERE a.id=:auctionId
         FOR UPDATE`,
        { replacements:{auctionId}, transaction },
      );
      if (!rows.length || rows[0].status !== 'OPEN') return;

      const auction=rows[0];

      await this.sequelize.query(
        `UPDATE auctions SET status='CLOSED_PENDING_FINALIZATION',updated_at=NOW()
         WHERE id=:auctionId`,
        { replacements:{auctionId}, transaction },
      );

      await this.sequelize.query(
        `UPDATE chit_months SET status='AUCTION_CLOSED',updated_at=NOW()
         WHERE id=:monthId AND status='BIDDING'`,
        { replacements:{monthId:auction.chit_month_id}, transaction },
      );

      await this.sequelize.query(
        `INSERT INTO audit_logs
         (id,actor_user_id,chit_id,action,entity_type,entity_id,after_data,created_at,updated_at)
         VALUES(gen_random_uuid(),NULL,:chitId,'AUCTION_WINDOW_CLOSED','AUCTION',:auctionId,:data,NOW(),NOW())`,
        { replacements:{
          chitId:auction.chit_id,
          auctionId,
          data:JSON.stringify({reason:'TIME_WINDOW_EXPIRED',closedAt:new Date().toISOString()})
        },transaction },
      );
    });

    this.gateway.emitClosed(auctionId,{
      auctionId,
      reason:'TIME_WINDOW_EXPIRED',
      status:'CLOSED_PENDING_FINALIZATION',
    });
  }
}
