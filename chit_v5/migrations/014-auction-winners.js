'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('auction_winners', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      auction_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'auctions', key: 'id' }, onDelete: 'SET NULL' },
      chit_participant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_participants', key: 'id' }, onDelete: 'SET NULL' },
      winning_bid_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'bids', key: 'id' }, onDelete: 'SET NULL' },
      winning_bid_amount: { type: Sequelize.DECIMAL(14,2), allowNull: true },
      selected_at: { type: Sequelize.DATE, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('auction_winners', { fields: ['auction_id'], type: 'unique', name: 'uq_auction_winners_auction_id' });
  },
  async down(queryInterface) { await queryInterface.dropTable('auction_winners'); }
};