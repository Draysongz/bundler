
const {Web3} = require('web3')
const WalletModel = require('./WalletModel')
const BundleWallet = require('./BundleWallet')



const alchemyEndpointKey = process.env.ALCHEMY_ENDPOINT_KEY || "";
const web3 = new Web3(Web3.givenProvider || `https://eth-mainnet.g.alchemy.com/v2/${alchemyEndpointKey}`)


const generateWallet = async ()=>{
  const wallet =   web3.eth.accounts.create()
  console.log(wallet)

  

  return{
    walletAddress: wallet.address,
    privateKey: wallet.privateKey,
  }
}


const importWallet = async (privateKey) =>{
   const wallet = web3.eth.accounts.privateKeyToAccount(privateKey)

   console.log(wallet)

   return {
    walletAddress: wallet.address,
    privateKey: wallet.privateKey,
   }
}





const saveBundleWalletToDB = async (walletAddress, privateKey, name) => {
  try {
    const wallet = new BundleWallet({
      walletAddress,
      privateKey,
      name
    });

    await wallet.save(); // Save the wallet to MongoDB
    console.log('Wallet saved successfully:', wallet);
    return wallet;
  } catch (error) {
    console.error('Error saving wallet to DB:', error);
    throw error; // Propagate the error for further handling if needed
  }
};

const createBundledWallet = async (numOfWallets)=>{
  try {
    const bundledWallets = web3.eth.accounts.wallet.create(numOfWallets)

    console.log(bundledWallets)
    return bundledWallets
  } catch (error) {
    console.log(error)
  }
}




const saveWalletToDB = async (walletAddress, privateKey, name, userId) => {
  try {
    const wallet = new WalletModel({
      walletAddress,
      privateKey,
      name,
      userId
    });

    await wallet.save(); // Save the wallet to MongoDB
    console.log('Wallet saved successfully:', wallet);
    return wallet;
  } catch (error) {
    console.error('Error saving wallet to DB:', error);
    throw error; // Propagate the error for further handling if needed
  }
};

// Function to fetch a wallet from the database by wallet address
const fetchWalletFromDB = async (walletAddress) => {
  try {
    const wallet = await WalletModel.findOne({ walletAddress }).exec();

    if (!wallet) {
      console.log('Wallet not found');
      return null;
    }

    console.log('Wallet fetched successfully:', wallet);
    return wallet;
  } catch (error) {
    console.error('Error fetching wallet from DB:', error);
    throw error; // Propagate the error for further handling if needed
  }
};


const fetchUserWallet = async (userId) => {
  try {
    const wallet = await WalletModel.find({ userId }).exec();

    if (!wallet) {
      console.log('Wallet not found');
      return null;
    }

    console.log('Wallet fetched successfully:', wallet);
    return wallet;
  } catch (error) {
    console.error('Error fetching wallet from DB:', error);
    throw error; // Propagate the error for further handling if needed
  }
};

const fetchAllWalletsFromDB = async () => {
  try {
    // Retrieve all wallet documents
    const wallets = await WalletModel.find().exec();

    if (wallets.length === 0) {
      console.log('No wallets found');
      return [];
    }

    console.log('All wallets fetched successfully:', wallets);
    return wallets;
  } catch (error) {
    console.error('Error fetching wallets from DB:', error);
    throw error; // Propagate the error for further handling if needed
  }
}

module.exports= {
    generateWallet,
    importWallet,
    saveWalletToDB,
    fetchWalletFromDB,
    fetchAllWalletsFromDB,
    createBundledWallet,
    fetchUserWallet
}