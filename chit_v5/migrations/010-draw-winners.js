'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('draw_winners', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      draw_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'draws', key: 'id' }, onDelete: 'SET NULL' },
      chit_participant_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'chit_participants', key: 'id' }, onDelete: 'SET NULL' },
      selected_at: { type: Sequelize.DATE, allowNull: true },
      selection_method: { type: Sequelize.STRING(20), allowNull: true },
      result_reference: { type: Sequelize.STRING(255), allowNull: true }
      ,created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addConstraint('draw_winners', { fields: ['draw_id'], type: 'unique', name: 'uq_draw_winners_draw_id' });
  },
  async down(queryInterface) { await queryInterface.dropTable('draw_winners'); }
};