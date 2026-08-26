'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('contribution_obligations', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_month_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_months', key: 'id' }, onDelete: 'SET NULL' },
      chit_participant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_participants', key: 'id' }, onDelete: 'SET NULL' },
      due_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      paid_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      outstanding_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      status: { type: Sequelize.STRING(30), allowNull: true },
      due_date: { type: Sequelize.DATEONLY, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('contribution_obligations'); }
};