const mongoose = require('mongoose');

const bundleWalletSchema =  new mongoose.Schema({
  address: {
    type: String,
    required: true
  },
  privateKey: {
    type: String,
    required: true
  }
})

const tokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
  },
  ticker: {
    type: String,
    required: true,
    uppercase: true, // Ensures that ticker symbols are stored in uppercase
  },
  totalSupply: {
    type: Number,
    required: true,
  },
  contractAddress: {
    type: String,
    required: true,
    unique: true, // Ensures that the contract address is unique
  },
  tokenDecimal: {
    type: Number,
    required:true
  },
  bundledWallets: {
    type: [mongoose.Schema.Types.Mixed], // Allows either objects or strings
    default: []
  },
  taxWallet: {
    type: String,
    required: true
  },
  bundlerAddress: {
    type: String,
    required: true
  },
  adminKey: {
    type: String,
    required: true
  }

}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
