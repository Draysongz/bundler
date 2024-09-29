const { ethers } = require("ethers");
const bundlerABI = require("./ABIs/Bundler.json");
require("dotenv").config();
const TokenABI = require("./ABIs/Token.json");
const { createNewBundler } = require("./bundler/bundlerFactory");

const coAdmin = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const providerUrl = "http://127.0.0.1:8545/";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);

const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey, provider);

async function deployBundler() {
  try {
    const newBundlerAddress = await createNewBundler(
      signer,
      signer.address,
      coAdmin
    );

    // save to DB

    return newBundlerAddress;
  } catch (error) {
    console.log("error from deployBundler()", error);
  }
}

async function bundler(bundlerAddress) {
  try {
    const bundlerContract = new ethers.Contract(
      bundlerAddress,
      bundlerABI,
      signer
    );

    return bundlerContract;
  } catch (err) {
    console.log("err from bundler()", err);
  }
}

// async function getAdminAddress(bundlerAddress) {
//   try {
//     const bundlerContract = await bundler(bundlerAddress);
//     const adminAddress = await bundlerContract.adminAddress();
//     console.log("Admin Address:", adminAddress);
//   } catch (error) {
//     console.error("Error fetching admin address:", error);
//   }
// }

// getAdminAddress();

async function deployToken(
  tokenName,
  tokenSymbol,
  totalSupply,
  tokenDecimals,
  taxWallet
) {
  try {
    // on new token, deploy new bundler
    const newBundlerAddress = await deployBundler();
    const bundlerContract = await bundler(newBundlerAddress);
    const tx = await bundlerContract.createNewToken(
      signer.address,
      taxWallet,
      tokenName,
      tokenSymbol,
      totalSupply,
      tokenDecimals
    );

    console.log("---------------------------------------");
    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait(); // Wait for the transaction to be mined

    // const contractAddress = receipt.contractAddress; // This contains the contract address
    const contractAddress = receipt.events[2].args[0]; // get the created token contract from the emitted event
    if (contractAddress) {
      console.log("---------------------------------------");
      console.log("Token deployed successfully at:", contractAddress, {
        hash: tx.hash,
      });
      console.log("---------------------------------------");
      return { contractAddress, newBundlerAddress }; // Return the contract address
    } else {
      console.log("Contract deployment failed.");
      return null;
    }
  } catch (error) {
    console.error("Error deploying token:", error);
  }
}

async function getDeployedTokens(bundlerAddress) {
  try {
    const bundlerContract = await bundler(bundlerAddress);
    const tokens = await bundlerContract.getTokens();
    console.log("deployed tokens", tokens);
    return tokens;
  } catch (error) {
    console.log(error);
  }
}

async function enableTradingAddLpPeformSwap(
  bundlerAddress,
  tokenAddress,
  buyTax,
  sellTax,
  ethToAddToLP,
  amountOfTokenToAddToLp,
  amountOfMinTokens, // can be zero - unavoidable slippage
  amountOfMinEth, // can be zero - unavoidable slippage
  addressToSendLPTo,
  deadline, // time range before transaction fails
  listOfSwapTransactions // list of objects according to SwapTransaction struct
) {
  try {
    const bundlerContract = await bundler(bundlerAddress);
    const taxes = [buyTax, sellTax];
    let totalValue = getTotalEthForTxs(listOfSwapTransactions);

    const fee = ethers.utils.parseEther(
      ethers.utils.formatEther(
        String(Number(totalValue) + Number(ethToAddToLP))
      )
    );
    const estimateGas =
      await bundlerContract.estimateGas.enableTradingWithLqToUniswap(
        tokenAddress,
        taxes,
        ethToAddToLP,
        amountOfTokenToAddToLp,
        amountOfMinTokens,
        amountOfMinEth,
        addressToSendLPTo,
        deadline,
        listOfSwapTransactions,
        { value: fee }
      );
    const tx = await bundlerContract.enableTradingWithLqToUniswap(
      tokenAddress,
      taxes,
      ethToAddToLP,
      amountOfTokenToAddToLp,
      amountOfMinTokens,
      amountOfMinEth,
      addressToSendLPTo,
      deadline,
      listOfSwapTransactions,
      { value: fee }
    );
    const totalFee = ethers.utils.formatEther(
      String(Number(fee) + Number(estimateGas) + 10000) // added 10000 cause estimate gas doesn't check inner function calls
    );
    console.log(
      `successful enableTradingAddLpPeformSwap() - total ethspent approx: ${totalFee}`,
      { hash: tx.hash }
    );

    return tx.hash;
  } catch (error) {
    console.log("Error from enableTradingAddLpPeformSwap()", error);
  }
}

async function sellTokensInAddress(
  bundlerAddress,
  tokenAddress,
  addressHoldingTokens,
  percentToSell,
  sendEthTo
) {
  try {
    const bundlerContract = await bundler(bundlerAddress);
    const ethBalBefore = await provider.getBalance(signer.address);
    const sellTokenstx = await bundlerContract.sellPerAddress(
      tokenAddress,
      addressHoldingTokens,
      percentToSell,
      sendEthTo
    );
    await sellTokenstx.wait();
    const ethBalAfter = await provider.getBalance(signer.address);
    if (Number(ethBalAfter) > Number(ethBalBefore)) {
      console.log(`sold from ${addressHoldingTokens} successfully`, {
        balBefore: ethers.utils.formatEther(ethBalBefore),
        balAfter: ethers.utils.formatEther(ethBalAfter),
      });
    }

    console.log("successful sellTokensInAddress()", sellTokenstx.hash);
    return sellTokenstx.hash;
  } catch (error) {
    console.log("error from sellTokensInAddress()", error);
  }
}

async function bundleBuy(bundlerAddress, tokenAddress, listOfSwapTransactions) {
  try {
    const bundlerContract = await bundler(bundlerAddress);

    const totalValue = getTotalEthForTxs(listOfSwapTransactions);
    const estimateGas = await bundlerContract.estimateGas.bundleBuys(
      tokenAddress,
      listOfSwapTransactions,
      { value: totalValue }
    );
    const bundleBuyTx = await bundlerContract.bundleBuys(
      tokenAddress,
      listOfSwapTransactions,
      { value: totalValue }
    );
    const totalFee = ethers.utils.formatEther(
      String(Number(totalValue) + Number(estimateGas) + 10000) // added 10000 cause estimate gas doesn't check inner function calls
    );
    console.log(
      `successfull bundleBuy() - total ethspent approx: ${totalFee}`,
      { hash: bundleBuyTx.hash }
    );
  } catch (error) {
    console.log("Error from bundleBuy()", error);
  }
}

async function bundleSell(
  bundlerAddress,
  tokenAddress,
  sendEthTo,
  percentToSell
) {
  try {
    const bundlerContract = await bundler(bundlerAddress);
    const bundleSellsTx = await bundlerContract.bundleSells(
      tokenAddress,
      sendEthTo,
      percentToSell
    );
    console.log("successful bundelSell()", { hash: bundleSellsTx.hash });
    return bundleSellsTx.hash;
  } catch (error) {
    console.log("Error from bundleSells()", error);
  }
}

async function updateTaxes(
  bundlerAddress,
  tokenAddress,
  newBuyTax,
  newSellTax
) {
  const bundlerContract = await bundler(bundlerAddress);

  const funcFrag = ["function updateTaxes(uint256 _buyTax, uint256 _sellTax)"];
  const interface = new ethers.utils.Interface(funcFrag);
  const funcSig = interface.encodeFunctionData("updateTaxes", [
    newBuyTax,
    newSellTax,
  ]);

  const transactions = [
    {
      to: tokenAddress,
      functionSignature: funcSig,
      value: 0n,
    },
  ];
  try {
    console.log(`functionSignature: ${funcSig}`);
    const tx = await bundlerContract.sendTransactions(transactions);

    console.log(`successfully updated taxed: `, { hash: tx.hash });
    return tx.hash;
  } catch (error) {
    console.log("Error from updateTaxes()", error);
  }
}

async function withdrawTax(tokenAddress, taxWalletAddress) {
  try {
    const token = new ethers.Contract(tokenAddress, TokenABI, signer);
    const tx = await token.swapTokensToETH(
      0,
      Math.floor(Date.now() / 1000 + 1800),
      taxWalletAddress
    );
    console.log(`tax withdrawal successful: `, { hash: tx.hash });
  } catch (error) {
    console.log("Error from withdrawTax()", error);
  }
}

function getTotalEthForTxs(listOfSwapTransactions) {
  let totalValue = 0;
  for (let i = 0; i < listOfSwapTransactions.length; i++) {
    const value = listOfSwapTransactions[i].etherBuyAmount;
    totalValue += Number(value);
  }

  return ethers.utils.parseEther(ethers.utils.formatEther(String(totalValue)));
}

// console.log(privateKey);
// await deployToken(
//   "TestToken",
//   "TST",
//   10000000,
//   18,
//   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
// );
async function ExamplePerimeterForTx() {
  const resp = await deployToken(
    "TestToken",
    "TST",
    10000000,
    18,
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  const bundlerAddress = resp.newBundlerAddress;
  const bundlerContract = await bundler(bundlerAddress);
  const swapTransactions = [
    {
      to: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      etherBuyAmount: ethers.utils.parseEther("1"),
      minAmountToken: 0,
      swapDeadline: Math.floor(Date.now() / 1000),
    },
    {
      to: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      etherBuyAmount: ethers.utils.parseEther("2"),
      minAmountToken: 0,
      swapDeadline: Math.floor(Date.now() / 1000),
    },
    {
      to: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      etherBuyAmount: ethers.utils.parseEther("3"),
      minAmountToken: 0,
      swapDeadline: Math.floor(Date.now() / 1000),
    },
  ];

  const tokens = await getDeployedTokens(bundlerAddress);
  const tokenAddress = tokens[tokens.length - 1];
  console.log("tokenAddress", tokenAddress);
  const buyTax = 5;
  const sellTax = 10;
  const ethLP = ethers.utils.parseEther("10");
  const tokenAmount = ethers.utils.parseEther("100000");
  const now = Math.floor(Date.now() / 1000);
  const token = new ethers.Contract(tokenAddress, TokenABI, signer);
  const tradingEnabled = await token.tradingEnabled();
  const bal = await token.balanceOf(signer.address);
  console.log("Token balance of owner", ethers.utils.formatEther(bal));
  const holdersList = await bundlerContract.getListOfHolders(tokenAddress);
  console.log({ holdersList, tradingEnabled });

  if (!tradingEnabled) {
    // add lp, enable trading and buy tokens
    await enableTradingAddLpPeformSwap(
      bundlerAddress,
      tokenAddress,
      buyTax,
      sellTax,
      ethLP,
      tokenAmount,
      0,
      0,
      signer.address,
      now,
      swapTransactions
    );
  }

  // buy more tokens
  await bundleBuy(bundlerAddress, tokenAddress, swapTransactions);

  const holdersAfterBuys = await bundlerContract.getListOfHolders(tokenAddress);
  const tradingEnabledAfterEnabling = await token.tradingEnabled();
  console.log({ holdersAfterBuys, tradingEnabledAfterEnabling });

  // sell tokens in an address
  const ethBalBefore = await provider.getBalance(signer.address);
  await sellTokensInAddress(
    bundlerAddress,
    tokenAddress,
    swapTransactions[0].to,
    300,
    signer.address
  );
  const ethBalAfter = await provider.getBalance(signer.address);
  if (Number(ethBalAfter) > Number(ethBalBefore)) {
    console.log(`sold from ${swapTransactions[0].to} successfully`, {
      balBefore: ethers.utils.formatEther(ethBalBefore),
      balAfter: ethers.utils.formatEther(ethBalAfter),
    });
  }

  // sell tokens in all addresses
  await bundleSell(bundlerAddress, tokenAddress, signer.address, 1000);
  const ethBalNow = await provider.getBalance(signer.address);
  if (Number(ethBalNow) > Number(ethBalAfter)) {
    console.log("sold tokens in all addresses succesfully", {
      balNow: ethers.utils.formatEther(ethBalNow),
    });
  }
  const holdersListNow = await bundlerContract.getListOfHolders(tokenAddress);
  console.log({ holdersListNow });

  console.log("-----------------------------------");
  // previous taxes
  const buyT = await token.buyTax();
  const sellT = await token.sellTax();

  console.log(`previous taxes: `, {
    buyTax: Number(buyT),
    sellTax: Number(sellT),
  });
  //update taxes
  const newBuyTax = 10;
  const newSellTax = 15;
  await updateTaxes(bundlerAddress, tokenAddress, newBuyTax, newSellTax);
  const newBuyT = await token.buyTax();
  const newSellT = await token.sellTax();
  console.log(`updated taxes: `, {
    newBuyTax: Number(newBuyT),
    newSellTax: Number(newSellT),
  });
}

const getBuyTax = async (tokenAddress) => {
  const token = new ethers.Contract(tokenAddress, TokenABI, signer);
  const buyTax = await token.buyTax();

  console.log(Number(buyTax));
  return Number(buyTax);
};

const getSellTax = async (tokenAddress) => {
  const token = new ethers.Contract(tokenAddress, TokenABI, signer);
  const sellTax = await token.sellTax();

  console.log(Number(sellTax));
  return Number(sellTax);
};

const getTokenBalance = async (tokenAddress, walletAddress) => {
  const token = new ethers.Contract(tokenAddress, TokenABI, signer);

  const tokenBalance = await token.balanceOf(walletAddress);

  const decimals = await token.decimals();

  const formattedBalance = ethers.utils.formatUnits(tokenBalance, decimals);

  console.log(Number(formattedBalance).toFixed(1));
  return Number(formattedBalance).toFixed(1);
};

const renounce = async (tokenAddress) => {
  try {
    // Create the contract instance with token address, ABI, and signer
    const token = new ethers.Contract(tokenAddress, TokenABI, signer);

    // The dead address (burn address on Ethereum)
    const deadAddress = "0x0000000000000000000000000000000000000000";

    // Call the contract's method to update the admin address to the dead address
    const changeAdminTx = await token.updateAdminAddress(deadAddress);

    // Wait for the transaction to be mined
    const receipt = await changeAdminTx.wait();

    console.log("Admin address updated to dead address successfully:", receipt);
    return receipt;
  } catch (error) {
    console.error("Error renouncing admin to dead address:", error);
    throw error;
  }
};

// ExamplePerimeterForTx();
module.exports = {
  deployToken,
  enableTradingAddLpPeformSwap,
  sellTokensInAddress,
  bundleBuy,
  bundleSell,
  updateTaxes,
  getDeployedTokens,
  getBuyTax,
  getSellTax,
  getTokenBalance,
  withdrawTax,
  renounce,
};
