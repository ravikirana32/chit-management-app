'use strict';

module.exports = {
  async up(queryInterface) {
    const statements = [
      `CREATE INDEX IF NOT EXISTS idx_payments_chit_month_status ON payments(chit_month_id,status)`,
      `CREATE INDEX IF NOT EXISTS idx_payouts_chit_month_status ON payouts(chit_month_id,status)`,
      `CREATE INDEX IF NOT EXISTS idx_ledger_chit_month ON ledger_entries(chit_month_id)`,
      `CREATE INDEX IF NOT EXISTS idx_obligations_month_status ON contribution_obligations(chit_month_id,status)`,
      `CREATE INDEX IF NOT EXISTS idx_import_batches_chit_status ON chit_import_batches(chit_id,status)`,
    ];
    for (const sql of statements) await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface) {
    const statements = [
      `DROP INDEX IF EXISTS idx_payments_chit_month_status`,
      `DROP INDEX IF EXISTS idx_payouts_chit_month_status`,
      `DROP INDEX IF EXISTS idx_ledger_chit_month`,
      `DROP INDEX IF EXISTS idx_obligations_month_status`,
      `DROP INDEX IF EXISTS idx_import_batches_chit_status`,
    ];
    for (const sql of statements) await queryInterface.sequelize.query(sql);
  },
};
