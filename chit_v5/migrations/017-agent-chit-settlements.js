'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('agent_chit_settlements', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_month_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_months', key: 'id' }, onDelete: 'SET NULL' },
      agent_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'agents', key: 'id' }, onDelete: 'SET NULL' },
      expected_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      collected_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      settled_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      payment_method: { type: Sequelize.STRING(30), allowNull: true },
      status: { type: Sequelize.STRING(30), allowNull: true },
      transaction_reference: { type: Sequelize.STRING(255), allowNull: true },
      settled_at: { type: Sequelize.DATE, allowNull: true },
      recorded_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      verified_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      receipt_number: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('agent_chit_settlements', { fields: ['chit_month_id'], type: 'unique', name: 'uq_agent_chit_settlements_chit_month_id' });
  },
  async down(queryInterface) { await queryInterface.dropTable('agent_chit_settlements'); }
};