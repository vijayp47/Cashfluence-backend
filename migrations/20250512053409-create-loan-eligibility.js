'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('LoanEligibility', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      state_code: {
        type: Sequelize.STRING(2),
        allowNull: false,
      },
      short_term_allowed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      short_term_max_amount: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      short_term_min_term: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      short_term_max_term: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      installment_allowed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      max_installment_apr: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      notes: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('LoanEligibility');
  },
};
