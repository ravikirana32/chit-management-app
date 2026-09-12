'use strict';

/** V58 - Running chit cutover metadata. */
module.exports = {
  async up(q, S) {
    const addColumnIfMissing = async (table, column, definition) => {
      const [rows] = await q.sequelize.query(`SELECT 1 FROM information_schema.columns WHERE table_name=:table AND column_name=:column LIMIT 1`, { replacements: { table, column } });
      if (!rows.length) await q.addColumn(table, column, definition);
    };
    await addColumnIfMissing('chits', 'onboarding_mode', { type: S.STRING(30), allowNull: false, defaultValue: 'NEW' });
    await addColumnIfMissing('chits', 'historical_month_count', { type: S.INTEGER, allowNull: false, defaultValue: 0 });
    await q.addIndex('chits', ['onboarding_mode'], { name: 'idx_chits_onboarding_mode' }).catch(() => {});
  },
  async down() {
    // Retain metadata on rollback so imported history remains auditable.
  },
};
