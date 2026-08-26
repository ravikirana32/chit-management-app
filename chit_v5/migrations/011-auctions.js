'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('auctions', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chits', key: 'id' }, onDelete: 'SET NULL' },
      chit_month_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_months', key: 'id' }, onDelete: 'SET NULL' },
      status: { type: Sequelize.STRING(30), allowNull: true },
      mode: { type: Sequelize.STRING(30), allowNull: true },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      minimum_bid: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      bid_increment: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      maximum_bid: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      winner_rule: { type: Sequelize.STRING(100), allowNull: true },
      tie_break_rule: { type: Sequelize.STRING(100), allowNull: true },
      eligibility_rule: { type: Sequelize.JSONB, allowNull: true },
      rules_snapshot: { type: Sequelize.JSONB, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('auctions', { fields: ['chit_month_id'], type: 'unique', name: 'uq_auctions_chit_month_id' });
  },
  async down(queryInterface) { await queryInterface.dropTable('auctions'); }
};