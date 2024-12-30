// migrations/xxxxxx-add-interest-column-to-loans.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Loans', 'interest', {
      type: Sequelize.DECIMAL(5, 2),  // You can adjust the precision and scale as needed
      allowNull: true,                // Set to false if this field is mandatory
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Loans', 'interest');
  }
};
