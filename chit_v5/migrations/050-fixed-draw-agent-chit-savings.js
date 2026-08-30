'use strict';

module.exports = {
  async up(q, S) {
    const add = async (table, column, definition) => {
      try { await q.addColumn(table, column, definition); } catch (_) {}
    };

    await add('chit_months', 'winner_payout_amount', {
      type: S.DECIMAL(14, 2), allowNull: true
    });
    await add('chit_months', 'draw_interest_opens_at', {
      type: S.DATE, allowNull: true
    });
    await add('chit_months', 'draw_interest_closes_at', {
      type: S.DATE, allowNull: true
    });
    await add('chit_months', 'draw_at', {
      type: S.DATE, allowNull: true
    });

    await add('draw_participants', 'interest_status', {
      type: S.STRING(20), allowNull: false, defaultValue: 'NO_RESPONSE'
    });
    await add('draw_participants', 'interest_at', {
      type: S.DATE, allowNull: true
    });

    await q.sequelize.query(`
      UPDATE chit_months
      SET winner_payout_amount = COALESCE(winner_payout_amount, scheduled_amount)
      WHERE winner_payout_amount IS NULL
    `);

    await q.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_draw_participants_interest
      ON draw_participants(draw_id, interest_status)
    `);

    await q.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chit_months_type_status
      ON chit_months(chit_id, month_type, status)
    `);
  },

  async down(q) {
    await q.sequelize.query('DROP INDEX IF EXISTS idx_chit_months_type_status');
    await q.sequelize.query('DROP INDEX IF EXISTS idx_draw_participants_interest');

    for (const [table, column] of [
      ['draw_participants', 'interest_at'],
      ['draw_participants', 'interest_status'],
      ['chit_months', 'draw_at'],
      ['chit_months', 'draw_interest_closes_at'],
      ['chit_months', 'draw_interest_opens_at'],
      ['chit_months', 'winner_payout_amount'],
    ]) {
      try { await q.removeColumn(table, column); } catch (_) {}
    }
  },
};
