'use strict';

/**
 * V55 - Running / Existing Chit onboarding.
 *
 * Additive only:
 * - existing chit/month/payment/payout records are not deleted or rewritten
 * - imported historical data is explicitly marked HISTORICAL
 * - historical summary is attached to the existing chit_month row
 * - import payload is retained on the existing import batch for audit/replay
 */
module.exports = {
  async up(q, S) {
    const addColumnIfMissing = async (table, column, definition) => {
      const [rows] = await q.sequelize.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_name=:table AND column_name=:column LIMIT 1`,
        { replacements: { table, column } },
      );
      if (!rows.length) await q.addColumn(table, column, definition);
    };

    await addColumnIfMissing('chit_months', 'data_origin', {
      type: S.STRING(20),
      allowNull: false,
      defaultValue: 'LIVE',
    });

    await addColumnIfMissing('chit_months', 'historical_data', {
      type: S.JSONB,
      allowNull: true,
    });

    await addColumnIfMissing('chit_import_batches', 'payload', {
      type: S.JSONB,
      allowNull: true,
    });

    await addColumnIfMissing('chit_import_batches', 'started_at', {
      type: S.DATE,
      allowNull: true,
    });

    await addColumnIfMissing('chit_import_batches', 'error_message', {
      type: S.TEXT,
      allowNull: true,
    });

    await addColumnIfMissing('payments', 'import_batch_id', {
      type: S.UUID,
      allowNull: true,
      references: { model: 'chit_import_batches', key: 'id' },
      onDelete: 'SET NULL',
    });

    await addColumnIfMissing('payouts', 'import_batch_id', {
      type: S.UUID,
      allowNull: true,
      references: { model: 'chit_import_batches', key: 'id' },
      onDelete: 'SET NULL',
    });

    await q.addIndex('chit_months', ['chit_id', 'data_origin'], {
      name: 'idx_chit_months_origin',
    }).catch(() => {});
  },

  async down(q) {
    // Intentionally conservative: do not drop columns from financial tables
    // automatically because a rollback must not destroy imported history.
  },
};
