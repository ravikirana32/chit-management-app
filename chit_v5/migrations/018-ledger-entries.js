'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('ledger_entries', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chits', key: 'id' }, onDelete: 'SET NULL' },
      chit_month_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_months', key: 'id' }, onDelete: 'SET NULL' },
      chit_participant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_participants', key: 'id' }, onDelete: 'SET NULL' },
      entry_type: { type: Sequelize.STRING(50), allowNull: true },
      reference_type: { type: Sequelize.STRING(50), allowNull: true },
      reference_id: { type: Sequelize.UUID, allowNull: true },
      debit_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      credit_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      running_balance: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('ledger_entries'); }
};