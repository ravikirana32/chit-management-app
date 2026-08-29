'use strict';

/**
 * Auction schema reconciliation.
 *
 * Canonical auction schema:
 *   auctions
 *   auction_participants
 *   bids
 *   auction_winners
 *
 * This fixes schema drift without renaming or dropping production tables.
 */
module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;

    // AuctionService.finalize() writes these fields.
    await q.query(`
      ALTER TABLE auctions
        ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL
    `);

    // Migration 013 normally creates this table. Keep this idempotent so
    // an existing Render database with migration/schema drift is repaired.
    await q.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auction_id UUID NULL REFERENCES auctions(id) ON DELETE SET NULL,
        chit_participant_id UUID NULL REFERENCES chit_participants(id) ON DELETE SET NULL,
        amount NUMERIC(14,2) NULL,
        sequence_number BIGINT NULL,
        status VARCHAR(30) NULL,
        submitted_at TIMESTAMP NULL,
        accepted_at TIMESTAMP NULL,
        client_reference VARCHAR(100) NULL,
        server_reference VARCHAR(100) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_bids_auction_status
      ON bids(auction_id, status)
    `);

    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_bids_auction_amount_time
      ON bids(auction_id, amount DESC, submitted_at ASC)
    `);
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;

    // Do not drop `bids` here because migration 013 owns that table and
    // it may contain production data.
    await q.query(`
      ALTER TABLE auctions
        DROP COLUMN IF EXISTS finalized_at,
        DROP COLUMN IF EXISTS completed_at
    `);
  },
};
