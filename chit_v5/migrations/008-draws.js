'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('draws', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chits', key: 'id' }, onDelete: 'SET NULL' },
      chit_month_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_months', key: 'id' }, onDelete: 'SET NULL' },
      status: { type: Sequelize.STRING(30), allowNull: true },
      selection_method: { type: Sequelize.STRING(20), allowNull: true },
      scheduled_at: { type: Sequelize.DATE, allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      executed_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      rules_snapshot: { type: Sequelize.JSONB, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('draws', { fields: ['chit_month_id'], type: 'unique', name: 'uq_draws_chit_month_id' });
  },
  async down(queryInterface) { await queryInterface.dropTable('draws'); }
};