const User = require('./User');
const PlaidUser = require('./PlaidUser');
const { Account } = require('./Plaid');

// ✅ Define Associations Here (After Models Are Imported)
User.hasOne(PlaidUser, {
  foreignKey: 'user_id',
  as: 'plaidUser',
  onDelete: 'CASCADE'
});

PlaidUser.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'plaidUser'
});


module.exports = { User, PlaidUser };
