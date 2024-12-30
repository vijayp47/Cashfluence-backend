// migrations/XXXXXX-add-risk-columns.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Loans', 'riskLevel', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Loans', 'riskScore', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Loans', 'riskLevel');
    await queryInterface.removeColumn('Loans', 'riskScore');
  }
};
