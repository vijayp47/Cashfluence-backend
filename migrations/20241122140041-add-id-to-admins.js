module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('admins', 'id', {
      type: Sequelize.UUID, // Use Sequelize's UUID type
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4, // Use Sequelize's built-in UUID generator
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('admins', 'id');
  },
};
