import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { AuctionGateway } from './auction.gateway';

@Injectable()
export class AuctionService {
  constructor(private readonly sequelize: Sequelize, private readonly gateway: AuctionGateway) {}

  async open(chitId: string, monthId: string, actorUserId: string, durationMinutes: number) {
    if (durationMinutes < 1 || durationMinutes > 60) {
      throw new BadRequestException('Auction duration must be between 1 and 60 minutes');
    }

    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT m.*, c.creator_id, c.chit_type, c.status AS chit_status
         FROM chit_months m
         JOIN chits c ON c.id = m.chit_id
         WHERE m.id = :monthId AND m.chit_id = :chitId
         FOR UPDATE`,
        { replacements: { monthId, chitId }, transaction },
      );

      if (!rows.length) throw new NotFoundException('Chit month not found');
      const month = rows[0];

      if (month.creator_id !== actorUserId) {
        throw new ConflictException('Only the creator can open an auction');
      }
      if (month.chit_type !== 'AUCTION') {
        throw new BadRequestException('This chit is not configured as an auction chit');
      }
      if (month.month_type === 'AGENT_CHIT') {
        throw new BadRequestException('Agent Chit months cannot be auctioned');
      }
      if (!['READY_TO_START', 'ACTIVE'].includes(month.chit_status)) {
        throw new ConflictException('Chit is not ready for auction');
      }
      if (!['SCHEDULED', 'READY_FOR_ACTION', 'COLLECTION'].includes(month.status)) {
        throw new ConflictException('This month is not available for auction');
      }

      const [existing]: any = await this.sequelize.query(
        `SELECT id, status
         FROM auctions
         WHERE chit_month_id = :monthId
         FOR UPDATE`,
        { replacements: { monthId }, transaction },
      );

      if (existing.some((x: any) => ['OPEN', 'FINALIZING', 'COMPLETED'].includes(x.status))) {
        throw new ConflictException('Auction already exists for this month');
      }

      const [auctionRows]: any = await this.sequelize.query(
        `INSERT INTO auctions
          (id, chit_id, chit_month_id, status, starts_at, ends_at, created_by,
           rules_snapshot, created_at, updated_at)
         VALUES
          (gen_random_uuid(), :chitId, :monthId, 'OPEN', NOW(),
           NOW() + (:duration || ' minutes')::interval, :actor, :rules, NOW(), NOW())
         RETURNING *`,
        {
          replacements: {
            chitId,
            monthId,
            duration: durationMinutes,
            actor: actorUserId,
            rules: JSON.stringify({
              windowMinutes: durationMinutes,
              maximumWindowMinutes: 60,
              winner: 'highest-valid-discount',
              tieBreaker: 'earliest-valid-bid',
            }),
          },
          transaction,
        },
      );

      await this.sequelize.query(
        `UPDATE chit_months
         SET status = 'BIDDING', updated_at = NOW()
         WHERE id = :monthId`,
        { replacements: { monthId }, transaction },
      );

      return auctionRows[0];
    });
  }

  async placeBid(
    auctionId: string,
    participantId: string,
    userId: string,
    bidAmount: string,
  ) {
    return this.sequelize.transaction(async transaction => {
      const [auctions]: any = await this.sequelize.query(
        `SELECT a.*, m.scheduled_amount, m.status AS month_status
         FROM auctions a
         JOIN chit_months m ON m.id = a.chit_month_id
         WHERE a.id = :auctionId
         FOR UPDATE`,
        { replacements: { auctionId }, transaction },
      );

      if (!auctions.length) throw new NotFoundException('Auction not found');
      const auction = auctions[0];

      if (auction.status !== 'OPEN') {
        throw new ConflictException('Auction is not open');
      }
      if (new Date(auction.ends_at).getTime() <= Date.now()) {
        throw new ConflictException('Auction bidding window has closed');
      }

      const [participants]: any = await this.sequelize.query(
        `SELECT cp.*, u.id AS verified_user_id
         FROM chit_participants cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.id = :participantId
           AND cp.chit_id = :chitId
         FOR UPDATE`,
        { replacements: { participantId, chitId: auction.chit_id }, transaction },
      );

      if (!participants.length) throw new NotFoundException('Participant not found');
      const participant = participants[0];

      if (participant.user_id !== userId) {
        throw new ConflictException('Authenticated user does not own this participant');
      }
      if (participant.status !== 'ACTIVE') {
        throw new ConflictException('Participant is not active');
      }

      const [previousWins]: any = await this.sequelize.query(
        `SELECT 1
         FROM draw_winners dw
         JOIN draws d ON d.id = dw.draw_id
         WHERE dw.chit_participant_id = :participantId AND d.chit_id = :chitId
         UNION ALL
         SELECT 1
         FROM auction_winners aw
         JOIN auctions pa ON pa.id = aw.auction_id
         WHERE aw.chit_participant_id = :participantId AND pa.chit_id = :chitId
         LIMIT 1`,
        { replacements: { participantId, chitId: auction.chit_id }, transaction },
      );

      if (previousWins.length) {
        throw new ConflictException('Participant has already won a previous chit month');
      }

      const bid = Number(bidAmount);
      const pot = Number(auction.scheduled_amount);

      if (!Number.isFinite(bid) || bid <= 0 || bid >= pot) {
        throw new BadRequestException(
          'Bid must be greater than zero and less than the scheduled chit amount',
        );
      }

      const [bids]: any = await this.sequelize.query(
        `INSERT INTO bids
          (id, auction_id, chit_participant_id, amount, sequence_number, status, submitted_at, accepted_at, client_reference, server_reference, created_at, updated_at)
         VALUES
          (gen_random_uuid(), :auctionId, :participantId, :bidAmount,
           COALESCE((SELECT MAX(sequence_number) FROM bids WHERE auction_id=:auctionId),0)+1,
           'VALID', NOW(), NOW(), NULL, CONCAT('BID-',gen_random_uuid()), NOW(), NOW())
         RETURNING *`,
        {
          replacements: {
            auctionId,
            participantId,
            bidAmount: bid,
          },
          transaction,
        },
      );

      this.gateway.emitBid(auctionId, {
        auctionId,
        participantId,
        bidAmount: bid,
        bidAt: bids[0].submitted_at,
      });
      return bids[0];
    });
  }

  async finalize(auctionId: string, actorUserId: string) {
    return this.sequelize.transaction(async transaction => {
      const [rows]: any = await this.sequelize.query(
        `SELECT a.*, m.scheduled_amount, m.chit_id, c.creator_id
         FROM auctions a
         JOIN chit_months m ON m.id = a.chit_month_id
         JOIN chits c ON c.id = a.chit_id
         WHERE a.id = :auctionId
         FOR UPDATE`,
        { replacements: { auctionId }, transaction },
      );

      if (!rows.length) throw new NotFoundException('Auction not found');
      const auction = rows[0];

      if (auction.creator_id !== actorUserId) {
        throw new ConflictException('Only the creator can finalize an auction');
      }
      if (auction.status === 'COMPLETED') {
        throw new ConflictException('Auction is already finalized');
      }
      if (auction.status !== 'OPEN') {
        throw new ConflictException('Auction is not open');
      }
      if (new Date(auction.ends_at).getTime() > Date.now()) {
        throw new ConflictException('Bidding window is still open');
      }

      await this.sequelize.query(
        `UPDATE auctions
         SET status = 'FINALIZING', finalized_at = NOW(), updated_at = NOW()
         WHERE id = :auctionId`,
        { replacements: { auctionId }, transaction },
      );

      const [bids]: any = await this.sequelize.query(
        `SELECT b.*, cp.user_id
         FROM bids b
         JOIN chit_participants cp ON cp.id = b.chit_participant_id
         WHERE b.auction_id = :auctionId
           AND b.status = 'VALID'
         ORDER BY b.amount DESC, b.submitted_at ASC
         FOR UPDATE`,
        { replacements: { auctionId }, transaction },
      );

      if (!bids.length) {
        throw new BadRequestException('No valid bids were received');
      }

      const winner = bids[0];
      const pot = Number(auction.scheduled_amount);
      const discount = Number(winner.amount);
      const payoutAmount = pot - discount;

      const [winnerRows]: any = await this.sequelize.query(
        `INSERT INTO auction_winners
          (id, auction_id, chit_participant_id, winning_bid_id, winning_bid_amount, selected_at, created_at, updated_at)
         VALUES
          (gen_random_uuid(), :auctionId, :participantId, :winningBidId, :bidAmount, NOW(), NOW(), NOW())
         RETURNING *`,
        {
          replacements: {
            auctionId,
            participantId: winner.chit_participant_id,
            winningBidId: winner.id,
            bidAmount: discount,
          },
          transaction,
        },
      );

      const [payoutRows]: any = await this.sequelize.query(
        `INSERT INTO payouts
          (id, chit_id, chit_month_id, recipient_user_id, amount, payment_method,
           status, recorded_by, notes, created_at, updated_at)
         VALUES
          (gen_random_uuid(), :chitId, :monthId, :userId, :amount, 'UPI',
           'PENDING', :actor, :notes, NOW(), NOW())
         RETURNING *`,
        {
          replacements: {
            chitId: auction.chit_id,
            monthId: auction.chit_month_id,
            userId: winner.user_id,
            amount: payoutAmount,
            actor: actorUserId,
            notes: `Auction discount: ₹${discount.toFixed(2)}`,
          },
          transaction,
        },
      );

      await this.sequelize.query(
        `UPDATE auctions
         SET status = 'COMPLETED',
             winner_participant_id = :participantId,
             winning_bid_amount = :bidAmount,
             discount_amount = :discount,
             payout_amount = :payout,
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = :auctionId`,
        {
          replacements: {
            auctionId,
            participantId: winner.chit_participant_id,
            winningBidId: winner.id,
            bidAmount: discount,
            discount,
            payout: payoutAmount,
          },
          transaction,
        },
      );

      await this.sequelize.query(
        `UPDATE chit_months
         SET status = 'COMPLETED', updated_at = NOW()
         WHERE id = :monthId`,
        { replacements: { monthId: auction.chit_month_id }, transaction },
      );

      await this.sequelize.query(
        `INSERT INTO audit_logs
          (id, actor_user_id, chit_id, action, entity_type, entity_id,
           after_data, created_at, updated_at)
         VALUES
          (gen_random_uuid(), :actor, :chitId, 'AUCTION_COMPLETED',
           'AUCTION', :auctionId, :data, NOW(), NOW())`,
        {
          replacements: {
            actor: actorUserId,
            chitId: auction.chit_id,
            auctionId,
            data: JSON.stringify({
              winnerParticipantId: winner.chit_participant_id,
              winningBid: discount,
              scheduledAmount: pot,
              payoutAmount,
              bidCount: bids.length,
            }),
          },
          transaction,
        },
      );

      this.gateway.emitClosed(auctionId, {
        auctionId,
        winnerParticipantId: winner.chit_participant_id,
        winningBid: discount,
        payoutAmount,
      });

      return {
        auctionId,
        winnerParticipantId: winner.chit_participant_id,
        winningBid: discount,
        scheduledAmount: pot,
        payoutAmount,
        bidCount: bids.length,
        rule: 'Winner remains active and continues future contributions.',
        winner: winnerRows[0],
        payout: payoutRows[0],
      };
    });
  }
}
