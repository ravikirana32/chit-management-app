'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS payout_settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
        amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
        payment_method VARCHAR(30) NOT NULL,
        transaction_reference VARCHAR(255) NOT NULL,
        notes TEXT NULL,
        recorded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_payout_settlements_payout_id
        ON payout_settlements(payout_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_settlements_reference
        ON payout_settlements(payout_id, transaction_reference);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS payout_settlements;`);
  }
};
