const mongoose = require('mongoose');

// Define the schema for the Wallet
const walletSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true, // Ensure wallet addresses are unique
  },
  privateKey: {
    type: String,
    required: true,
  },

  name: {type: String, unique: true}
}, {timestamps: true});

// Create the Wallet model from the schema
const WalletModel = mongoose.model('Wallet', walletSchema);

module.exports = WalletModel;
