'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      actor_user_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      chit_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chits', key: 'id' }, onDelete: 'SET NULL' },
      action: { type: Sequelize.STRING(100), allowNull: true },
      entity_type: { type: Sequelize.STRING(80), allowNull: true },
      entity_id: { type: Sequelize.UUID, allowNull: true },
      before_data: { type: Sequelize.JSONB, allowNull: true },
      after_data: { type: Sequelize.JSONB, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.INET, allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('audit_logs'); }
};