const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Define the Account model
const Account = sequelize.define('Account', {
  accountId: {
    type: DataTypes.STRING, // Ensure accountId is a STRING
    allowNull: false,
   
    primaryKey: true, // Set as primary key to avoid type mismatches
  },
  accessToken: {
    type: DataTypes.STRING, // Ensure accountId is a STRING
    allowNull: true,
 
  },
  mask: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  officialName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  persistentAccountId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subtype: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  institution_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  institution_id:{
    type: DataTypes.STRING,
    allowNull: false},
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    // references: {
    //   model: 'Users',  // Reference to the 'Users' table
    //   key: 'id'    // The primary key column of Users
    // }
  }
});

// Define the Balances model
const Balances = sequelize.define('Balances', {
  accountId: {
    type: DataTypes.STRING, // Ensure accountId is a STRING here as well
    allowNull: false,
  },
  available: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  current: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  isoCurrencyCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  limit: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  unofficialCurrencyCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    
  }
});

// Define the Mortgage model
const Mortgage = sequelize.define('Mortgage', {
  accountId: {
    type: DataTypes.STRING, // Ensure accountId is a STRING here too
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  currentLateFee: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  escrowBalance: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  hasPmi: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  hasPrepaymentPenalty: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  interestRatePercentage: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  interestRateType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastPaymentAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  lastPaymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  loanTerm: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  loanTypeDescription: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  maturityDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  nextMonthlyPayment: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  nextPaymentDueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  originationDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  originationPrincipalAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  pastDueAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  propertyAddress: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  ytdInterestPaid: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  ytdPrincipalPaid: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    
  }
});

// Define the Student Loan model
const StudentLoan = sequelize.define('StudentLoan', {
  accountId: {
    type: DataTypes.STRING, // Ensure accountId is a STRING here as well
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  disbursementDates: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  expectedPayoffDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  guarantor: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  interestRatePercentage: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  isOverdue: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  lastPaymentAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  lastPaymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  lastStatementBalance: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  lastStatementIssueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  loanName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  loanStatus: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  minimumPaymentAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  nextPaymentDueDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  originationDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  originationPrincipalAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  outstandingInterestAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  repaymentPlan: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  servicerAddress: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  ytdInterestPaid: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  ytdPrincipalPaid: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    
  }
});

// Relationships
Account.hasOne(Balances, { 
    foreignKey: {
      name: 'accountId', 
      type: DataTypes.STRING,  // Define accountId as STRING in Balances
      allowNull: false,
    }, 
    onDelete: 'CASCADE' 
  });
  Balances.belongsTo(Account, { 
    foreignKey: { 
      name: 'accountId', 
      type: DataTypes.STRING, // Define accountId as STRING in Balances
      allowNull: false,
    } 
  });
  
  Account.hasOne(Mortgage, { 
    foreignKey: { 
      name: 'accountId', 
      type: DataTypes.STRING,  // Define accountId as STRING in Mortgage
      allowNull: false,
    }, 
    onDelete: 'CASCADE' 
  });
  Mortgage.belongsTo(Account, { 
    foreignKey: { 
      name: 'accountId', 
      type: DataTypes.STRING,  // Define accountId as STRING in Mortgage
      allowNull: false,
    } 
  });
  
  Account.hasOne(StudentLoan, { 
    foreignKey: { 
      name: 'accountId', 
      type: DataTypes.STRING,  // Define accountId as STRING in StudentLoan
      allowNull: false,
    }, 
    onDelete: 'CASCADE' 
  });
  StudentLoan.belongsTo(Account, { 
    foreignKey: { 
      name: 'accountId', 
      type: DataTypes.STRING, // Define accountId as STRING in StudentLoan
      allowNull: false,
    } 
  });
  

module.exports = { Account, Balances, Mortgage, StudentLoan };
