'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('disputes', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chits', key: 'id' }, onDelete: 'SET NULL' },
      chit_month_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_months', key: 'id' }, onDelete: 'SET NULL' },
      raised_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      category: { type: Sequelize.STRING(80), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      reference_type: { type: Sequelize.STRING(50), allowNull: true },
      reference_id: { type: Sequelize.UUID, allowNull: true },
      status: { type: Sequelize.STRING(30), allowNull: true },
      resolution: { type: Sequelize.TEXT, allowNull: true },
      resolved_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      resolved_at: { type: Sequelize.DATE, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('disputes'); }
};