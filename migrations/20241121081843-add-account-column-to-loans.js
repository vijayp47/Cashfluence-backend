// migrations/xxxxxx-add-account-column-to-loans.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Loans', 'account', {
      type: Sequelize.STRING,
      allowNull: true,  // Set to false if you want this field to be mandatory
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Loans', 'account');
  }
};
