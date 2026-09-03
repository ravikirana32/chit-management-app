'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of ['draws', 'auctions']) {
      await queryInterface.addColumn(table, 'reveal_status', { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'NONE' });
      await queryInterface.addColumn(table, 'reveal_started_at', { type: Sequelize.DATE, allowNull: true });
      await queryInterface.addColumn(table, 'reveal_ends_at', { type: Sequelize.DATE, allowNull: true });
      await queryInterface.addColumn(table, 'winner_revealed_at', { type: Sequelize.DATE, allowNull: true });
      await queryInterface.addColumn(table, 'reveal_duration_seconds', { type: Sequelize.INTEGER, allowNull: true });
      await queryInterface.addIndex(table, ['reveal_status', 'reveal_ends_at'], { name: `${table}_reveal_due_idx` });
    }
  },
  async down(queryInterface) {
    for (const table of ['draws', 'auctions']) {
      await queryInterface.removeIndex(table, `${table}_reveal_due_idx`).catch(() => undefined);
      for (const column of ['reveal_duration_seconds', 'winner_revealed_at', 'reveal_ends_at', 'reveal_started_at', 'reveal_status']) {
        await queryInterface.removeColumn(table, column).catch(() => undefined);
      }
    }
  },
};
