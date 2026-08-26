'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('payouts', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chits', key: 'id' }, onDelete: 'SET NULL' },
      chit_month_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_months', key: 'id' }, onDelete: 'SET NULL' },
      payout_calculation_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'payout_calculations', key: 'id' }, onDelete: 'SET NULL' },
      recipient_user_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      recipient_agent_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'agents', key: 'id' }, onDelete: 'SET NULL' },
      amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      payment_method: { type: Sequelize.STRING(30), allowNull: true },
      status: { type: Sequelize.STRING(30), allowNull: true },
      transaction_reference: { type: Sequelize.STRING(255), allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      recorded_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      verified_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      receipt_number: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('payouts'); }
};