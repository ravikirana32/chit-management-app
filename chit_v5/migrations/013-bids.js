'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('bids', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      auction_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'auctions', key: 'id' }, onDelete: 'SET NULL' },
      chit_participant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_participants', key: 'id' }, onDelete: 'SET NULL' },
      amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      sequence_number: { type: Sequelize.BIGINT, allowNull: true },
      status: { type: Sequelize.STRING(30), allowNull: true },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      client_reference: { type: Sequelize.STRING(100), allowNull: true },
      server_reference: { type: Sequelize.STRING(100), allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('bids'); }
};