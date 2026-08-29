import { Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class AuctionStateService {
  constructor(private readonly sequelize: Sequelize) {}

  async getState(auctionId: string) {
    const [rows]: any = await this.sequelize.query(
      `SELECT
         a.id,
         a.status,
         a.starts_at,
         a.ends_at,
         a.winning_bid_amount,
         a.discount_amount,
         a.payout_amount,
         m.id AS month_id,
         m.month_number,
         m.scheduled_amount,
         m.scheduled_date
       FROM auctions a
       JOIN chit_months m ON m.id = a.chit_month_id
       WHERE a.id = :auctionId`,
      { replacements: { auctionId } },
    );

    if (!rows.length) {
      throw new NotFoundException('Auction not found');
    }

    const auction = rows[0];

    // Canonical database schema uses `bids`, `amount`, and `submitted_at`.
    // The previous implementation incorrectly queried `auction_bids`,
    // `bid_amount`, and `bid_at`.
    const [bids]: any = await this.sequelize.query(
      `SELECT
         b.id,
         b.chit_participant_id,
         b.amount AS bid_amount,
         b.submitted_at AS bid_at,
         cp.participant_sequence
       FROM bids b
       JOIN chit_participants cp
         ON cp.id = b.chit_participant_id
       WHERE b.auction_id = :auctionId
         AND b.status = 'VALID'
       ORDER BY b.amount DESC, b.submitted_at ASC
       LIMIT 50`,
      { replacements: { auctionId } },
    );

    const closeMs = new Date(auction.ends_at).getTime();

    return {
      auctionId,
      status: auction.status,
      // Keep the existing public API response names stable.
      opensAt: auction.starts_at,
      closesAt: auction.ends_at,
      remainingSeconds: Math.max(
        0,
        Math.floor((closeMs - Date.now()) / 1000),
      ),
      month: {
        id: auction.month_id,
        number: auction.month_number,
        scheduledAmount: auction.scheduled_amount,
        scheduledDate: auction.scheduled_date,
      },
      winningBid: auction.winning_bid_amount,
      discount: auction.discount_amount,
      payoutAmount: auction.payout_amount,
      bids,
    };
  }
}
