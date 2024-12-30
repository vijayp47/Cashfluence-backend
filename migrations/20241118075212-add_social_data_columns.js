module.exports = {
  up: async (queryInterface, Sequelize) => {
 
    await queryInterface.addColumn('interestRateTable', 'instagram_data', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('interestRateTable', 'youtube_data', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('interestRateTable', 'facebook_data', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('interestRateTable', 'twitter_data', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
   
  },

  down: async (queryInterface, Sequelize) => {
   
    await queryInterface.removeColumn('interestRateTable', 'instagram_data');
    await queryInterface.removeColumn('interestRateTable', 'youtube_data');
    await queryInterface.removeColumn('interestRateTable', 'facebook_data');
    await queryInterface.removeColumn('interestRateTable', 'twitter_data');
    
  },
};
