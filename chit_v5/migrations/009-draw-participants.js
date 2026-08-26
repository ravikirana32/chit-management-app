'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('draw_participants', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      draw_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'draws', key: 'id' }, onDelete: 'SET NULL' },
      chit_participant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_participants', key: 'id' }, onDelete: 'SET NULL' },
      eligibility_status: { type: Sequelize.STRING(30), allowNull: true },
      exclusion_reason: { type: Sequelize.STRING(255), allowNull: true },
      participant_sequence: { type: Sequelize.INTEGER, allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('draw_participants'); }
};