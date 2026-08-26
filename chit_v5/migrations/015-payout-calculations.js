'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('payout_calculations', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chits', key: 'id' }, onDelete: 'SET NULL' },
      chit_month_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_months', key: 'id' }, onDelete: 'SET NULL' },
      recipient_type: { type: Sequelize.STRING(30), allowNull: true },
      recipient_user_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      recipient_agent_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'agents', key: 'id' }, onDelete: 'SET NULL' },
      gross_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      discount_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      commission_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      other_adjustment_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      net_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      calculation_snapshot: { type: Sequelize.JSONB, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('payout_calculations'); }
};