'use strict';

/**
 * V54 additive settlement model.
 *
 * Contribution payments already support multiple payment rows against the
 * same obligation, so CASH + UPI contributions require no destructive schema
 * change. This migration adds the equivalent component model for payouts.
 *
 * Existing payouts remain fully compatible: the legacy payment_method and
 * transaction_reference columns are retained and continue to be populated.
 */
module.exports = {
  async up(q, S) {
    await q.createTable('payout_transactions', {
      id: {
        type: S.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: S.literal('gen_random_uuid()'),
      },
      payout_id: {
        type: S.UUID,
        allowNull: false,
        references: { model: 'payouts', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: S.DECIMAL(14, 2), allowNull: false },
      payment_method: { type: S.STRING(30), allowNull: false },
      transaction_reference: { type: S.STRING(255), allowNull: true },
      status: { type: S.STRING(30), allowNull: false, defaultValue: 'SETTLED' },
      paid_at: { type: S.DATE, allowNull: true },
      recorded_by: {
        type: S.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      notes: { type: S.TEXT, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });

    await q.addIndex('payout_transactions', ['payout_id'], {
      name: 'idx_payout_transactions_payout_id',
    });

    await q.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_payout_transactions_method
        ON payout_transactions(payment_method)
    `);
  },

  async down(q) {
    await q.dropTable('payout_transactions');
  },
};
