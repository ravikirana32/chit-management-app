'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('documents', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      chit_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chits', key: 'id' }, onDelete: 'SET NULL' },
      owner_user_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      document_type: { type: Sequelize.STRING(80), allowNull: true },
      file_name: { type: Sequelize.STRING(255), allowNull: true },
      storage_key: { type: Sequelize.TEXT, allowNull: true },
      mime_type: { type: Sequelize.STRING(100), allowNull: true },
      size_bytes: { type: Sequelize.BIGINT, allowNull: true },
      checksum: { type: Sequelize.STRING(128), allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('documents'); }
};