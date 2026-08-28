'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM user_roles
      WHERE user_id IS NULL OR role IS NULL OR TRIM(role) = ''
    `);

    try {
      await queryInterface.changeColumn('user_roles', 'user_id', {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      });
    } catch (_) {}

    try {
      await queryInterface.changeColumn('user_roles', 'role', {
        type: Sequelize.STRING(40),
        allowNull: false,
      });
    } catch (_) {}

    try {
      await queryInterface.addConstraint('user_roles', {
        fields: ['user_id', 'role'],
        type: 'unique',
        name: 'uq_user_role',
      });
    } catch (_) {}
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeConstraint('user_roles', 'uq_user_role');
    } catch (_) {}
  },
};
