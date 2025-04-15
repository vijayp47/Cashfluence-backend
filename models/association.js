const User = require('./User');
const PlaidUser = require('./PlaidUser');
const { Account } = require('./Plaid');
const Loan = require('./Loan');  // Import Loan model
const Transaction = require('./Transaction'); // Import Transaction model

// ✅ Define Associations Here (After Models Are Imported)

// User  PlaidUser
User.hasOne(PlaidUser, {
  foreignKey: 'user_id',
  as: 'plaidUser',
  onDelete: 'CASCADE'
});

PlaidUser.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'plaidUser'
});

// User ↔ Loan
User.hasMany(Loan, { foreignKey: 'userId', as: 'loans' });
Loan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Loan ↔ Transaction
Loan.hasMany(Transaction, { foreignKey: 'loan_id', as: 'transactions' });
Transaction.belongsTo(Loan, { foreignKey: 'loan_id', as: 'loan' });

module.exports = { User, PlaidUser, Loan, Transaction };
