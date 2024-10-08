const { Scenes, session, Telegraf, Markup } = require("telegraf");
const dotenv = require("dotenv").config();
const {
  handleDeploySteps1,
  handleDeploySteps2,
  handleDeploySteps3,
  handleDeploySteps4,
  handleDeploySteps5,
  handleDeploySteps6,
  handleDeploySteps7,
  handleSkip,
  handleDeploySteps8,
  handleDeploySteps9,
  handleDeploySteps10,
  isValidEthereumAddress,
  handleDeploySteps11,
} = require("./steps");
const connectDB = require("./connect");
const {
  generateWallet,
  importWallet,
  fetchAllWalletsFromDB,
  saveWalletToDB,
  fetchWalletFromDB,
  createBundledWallet,
  fetchUserWallet,
} = require("./wallet");
const {
  deployToken,
  getDeployedTokens,
  enableTradingAddLpPeformSwap,
  getBuyTax,
  getSellTax,
  sellTokensInAddress,
  bundleSell,
  withdrawTax,
  updateTaxes,
  renounce,
  provider,
} = require("./contract");
const Token = require("./TokenModel");
const {
  handleBundleStep1,
  handleBundleStep2,
  handleBundleStep3,
  handleBundleStep4,
  handleBundleStep5,
  handleBundleStep6,
  handleBundleStep7,
} = require("./bundleSteps");
const { parseEther, formatUnits } = require("ethers/lib/utils");
const {
  calculatePriceForBundlePercent,
  floor,
  getPriceEstimates,
} = require("./misc");
const { ethers } = require("ethers");
const { handleSell25, exportPrivateKey } = require("./utils/holding");
const { priorityGas, calcGas } = require("./utils/gas");

connectDB();

const botToken = process.env.BOT_TOKEN || "";
console.log(botToken);

const bot = new Telegraf(botToken);

const deployScene = new Scenes.BaseScene("deployScene");
const walletScene = new Scenes.BaseScene("walletScene");
const AddWalletScene = new Scenes.BaseScene("addWalletScene");
const tokenScene = new Scenes.BaseScene("tokenScene");
const bundleScene = new Scenes.BaseScene("bundleScene");
const taxScene = new Scenes.BaseScene("taxScene");
const holdingsScene = new Scenes.BaseScene("holdingsScene");
const simultaneousScene = new Scenes.BaseScene("simultaneousScene");
const withdrawScene = new Scenes.BaseScene("withdrawScene");
const sellAllScene = new Scenes.BaseScene("sellAllScene");

const stage = new Scenes.Stage([
  deployScene,
  walletScene,
  AddWalletScene,
  tokenScene,
  bundleScene,
  taxScene,
  holdingsScene,
  simultaneousScene,
  withdrawScene,
  sellAllScene,
]);
bot.use(session());
bot.use(stage.middleware());

deployScene.enter(async (ctx) => {
  ctx.session.tokenDetails = {};

  await ctx.reply("Please provide the token name");

  ctx.session.stepCount = 1;
});

deployScene.on("message", async (ctx) => {
  const currentStep = ctx.session.stepCount || 1;
  console.log("Entering switch statement. Current step:", currentStep);

  switch (currentStep) {
    case 1:
      await handleDeploySteps1(ctx);
      break;

    case 2:
      await handleDeploySteps2(ctx);
      break;

    case 3:
      await handleDeploySteps3(ctx);
      break;

    case 4:
      await handleDeploySteps4(ctx);
      break;

    case 5:
      await handleDeploySteps5(ctx);
      break;

    case 6:
      await handleDeploySteps6(ctx);
      break;

    case 7:
      await handleDeploySteps7(ctx);
      break;

    case 8:
      await handleDeploySteps8(ctx);
      break;

    case 9:
      await handleDeploySteps9(ctx);
      break;

    case 10:
      await handleDeploySteps10(ctx);
      break;

    case 11:
      await handleDeploySteps11(ctx);
      break;

    default:
      // Handle unexpected steps or do nothing
      ctx.reply("Unexpected input. Please follow the conversation flow.");
      ctx.session.stepCount = null;
      ctx.scene.leave();
      break;
  }
});

deployScene.action("generate_wallet", async (ctx) => {
  const userId = ctx.from.id;
  try {
    const { privateKey, walletAddress } = await generateWallet();
    const wallets = await fetchUserWallet(userId);
    const walletName = wallets.length + 1;
    await saveWalletToDB(walletAddress, privateKey, `w${walletName}`, userId);
   
    const signer = new ethers.Wallet(privateKey, provider);
    let gas =  await calcGas(signer, 6593692, true)
    console.log(gas)
    gas = parseFloat(gas).toFixed(2)
    console.log("gas in ETH", gas)
                                                                                                                                                                                                                     
    ctx.replyWithHTML(
      `Created new wallet\n\n
        <b>Wallet</b>\n${walletAddress}  \n\n <b>Private Key</b>\n ${privateKey} \n\n <b>Please fund your wallet with ${gas} ETH for deployment</b>`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Proceed to deploy", callback_data: "deploy_token" }],
          ],
        },
      }
    );
    ctx.session.tokenDetails.privateKey = privateKey;
  } catch (error) {
    console.log("error creating wallet..", error);
    ctx.reply(
      "An error occurred while generating the wallet. Please try again later."
    );
  }
});

AddWalletScene.enter(async (ctx) => {
  ctx.reply("Please send your private key to add the wallet.", {
    reply_markup: {
      force_reply: true,
    },
  });
});

AddWalletScene.on("message", async (ctx) => {
  const privateKey = ctx.message.text.trim();

  try {
    // Import the wallet using the private key
    const { walletAddress } = await importWallet(privateKey);

    // Check if the wallet already exists in the database
    const existing = await fetchWalletFromDB(walletAddress);

    if (existing) {
      // If the wallet already exists, notify the user and exit the scene
      ctx.reply("The wallet has been imported before.");
      ctx.scene.leave();
    } else {
      // Fetch all wallets to create a unique name for the new wallet
      const wallets = await fetchAllWalletsFromDB();
      const walletName = `w${wallets.length + 1}`;

      // Save the new wallet to the database
      await saveWalletToDB(walletAddress, privateKey, walletName);

      // Send a confirmation message to the user
      ctx.replyWithHTML(
        `✅ Wallet imported successfully!\n\n` +
          `<b>Wallet Address:</b>\n${walletAddress}\n\n` +
          `<b>Private Key:</b>\n${privateKey}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Delete Message", callback_data: "delete_message" }],
            ],
          },
        }
      );
    }
  } catch (error) {
    console.error("Error importing wallet:", error);
    ctx.reply(
      "❌ Error importing the wallet. Please make sure the private key is valid."
    );
  }
});
tokenScene.enter(async (ctx) => {
  const userId = ctx.from.id
  try {
    const deployedTokens = await Token.find({userId}).exec();

    if (deployedTokens.length === 0) {
      // No tokens found
      ctx.reply("You've not created any token");
    } else {
      // Tokens exist, show inline keyboard with token names and tickers side by side
      let tokenButtons = [];
      for (let i = 0; i < deployedTokens.length; i += 2) {
        const row = [];
        row.push({
          text: deployedTokens[i].name,
          callback_data: deployedTokens[i].contractAddress,
        });
        if (deployedTokens[i + 1]) {
          row.push({
            text: deployedTokens[i + 1].name,
            callback_data: deployedTokens[i + 1].contractAddress,
          });
        }
        tokenButtons.push(row);
      }
      tokenButtons = [
        ...tokenButtons,
        [{ text: "Back", callback_data: "back_button" }],
      ];

      ctx.replyWithHTML(
        "<b>List of deployed tokens</b>\nPlease click on any token to view more details:",
        {
          reply_markup: {
            inline_keyboard: tokenButtons,
          },
        }
      );
    }
  } catch (error) {
    // Handle error
    console.error("Error fetching deployed tokens:", error);
    ctx.reply(
      "An error occurred while fetching deployed tokens. Please try again later."
    );
  }
});
bundleScene.enter(async (ctx) => {
  const contractAddress = ctx.scene.state.contractAddress;
  const randomWalletsOption = ctx.scene.state.randomWallets;
  const bundlerAddress = ctx.scene.state.bundlerAddress;
  ctx.session.randomWallets = randomWalletsOption;
  ctx.session.bundlerAddress = bundlerAddress;
  console.log(contractAddress, randomWalletsOption);
  ctx.reply("Please provide the buy tax value");

  ctx.session.bundleDetails = {};

  ctx.session.bundleSteps = 1;
});

bundleScene.on("message", async (ctx) => {
  const bundleSteps = ctx.session.bundleSteps || 1;

  switch (bundleSteps) {
    case 1:
      await handleBundleStep1(ctx);
      break;

    case 2:
      await handleBundleStep2(ctx);
      break;

    case 3:
      await handleBundleStep3(ctx);
      break;

    case 4:
      await handleBundleStep4(ctx);
      break;

    case 5:
      await handleBundleStep5(ctx);
      break;

    case 6:
      await handleBundleStep6(ctx);
      break;

    case 7:
      await handleBundleStep7(ctx);
      break;

    default:
      // Handle unexpected steps or do nothing
      ctx.reply("Unexpected input. Please follow the conversation flow.");
      ctx.session.stepCount = null;
      ctx.scene.leave();
      break;
  }
});

bundleScene.action("simulate_bundle", async (ctx) => {
  let numOfWallets;
  const walletAddresses = ctx.session.bundleDetails.walletAddresses;
  if (ctx.session.randomWallets.toLowerCase() == "no" && walletAddresses) {
    numOfWallets = walletAddresses.length;
  } else {
    numOfWallets = parseInt(ctx.session.bundleDetails.bundlePercent);
  }
  const ethToAddToLP = parseInt(ctx.session.bundleDetails.ethToAddToLP);
  const percentageTokenToAddToLp = parseInt(
    ctx.session.bundleDetails.percentageTokenToAddToLp
  );
  const contractAddress = ctx.scene.state.contractAddress;
  const tokenDetails = await Token.findOne({ contractAddress }).exec();
  if (!tokenDetails) {
    console.log("Token not found");
    return null;
  }

  const totalSupply = tokenDetails.totalSupply;
  const ethPriceInUsd = await getEthPriceInUSD(); // This function should fetch ETH price in USD

  try {
    const {
      startPriceOfToken,
      startMarketCap,
      totalPriceForBundlerPercent,
      currentTokenPrice,
      endMarketCap,
      pricePerTransaction,
      percentagePriceMoved,
      amountOfTokenToAddToLp,
    } = getPriceEstimates(
      ethToAddToLP,
      percentageTokenToAddToLp,
      numOfWallets,
      totalSupply
    );

    // Handle decimal points, rounding to 4 decimal places (adjust as needed)
    const formattedStartPriceOfToken = Number(startPriceOfToken).toFixed(8);
    const formattedStartMarketCap = Number(startMarketCap).toFixed(2);
    const formattedTotalPriceForBundlerPercent = Number(
      totalPriceForBundlerPercent
    ).toFixed(2);
    const formattedPricePerTransaction = Number(pricePerTransaction).toFixed(4);
    const formattedPercentagePriceMoved =
      Number(percentagePriceMoved).toFixed(2);
    const formattedEndMarketCap = Number(endMarketCap).toFixed(2);
    const formattedAmountOfTokenToAddToLp = Number(
      amountOfTokenToAddToLp
    ).toLocaleString();
    const TotalCost = ethToAddToLP + totalPriceForBundlerPercent + 0.5;

    // Convert market cap to USD
    const startMarketCapInUSD = (startMarketCap * ethPriceInUsd).toFixed(2);
    const endMarketCapInUSD = (endMarketCap * ethPriceInUsd).toFixed(2);

    ctx.replyWithHTML(
      `
<b>Bundler Simulation Result:  </b>
Initial Token Price: ${formattedStartPriceOfToken} ETH
Initial MC: ${formattedStartMarketCap} ETH (${startMarketCapInUSD} USD)
Total Bundler Cost: ${formattedTotalPriceForBundlerPercent} ETH
Cost Per Bundler wallet: ${formattedPricePerTransaction} ETH
Token quantity to LP: ${formattedAmountOfTokenToAddToLp}
Percentage Increase (after bundle buys): ${formattedPercentagePriceMoved}%
Final MC (after bundle buy): ${formattedEndMarketCap} ETH (${endMarketCapInUSD} USD)
Dev bribe Fee: 0.5 ETH
Total Cost: ${TotalCost} ETH

      `,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "back", callback_data: "back_button" }]],
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
});

// Fetch ETH price in USD
const getEthPriceInUSD = async () => {
  // Assuming you have an API or some way to fetch the current ETH price
  // Here is a basic example using CoinGecko's API
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  const data = await response.json();
  return data.ethereum.usd;
};

bundleScene.action("confirm_bundle", async (ctx) => {
  await ctx.reply(
    "Enabling trading, Adding Lp and buying with bundled wallets..."
  );
  let numOfWallets;
  const walletAddresses = ctx.session.bundleDetails.walletAddresses;
  console.log(walletAddresses);
  const bundlerAddress = ctx.session.bundlerAddress;
  if (ctx.session.randomWallets.toLowerCase() == "no" && walletAddresses) {
    numOfWallets = walletAddresses.length;
  } else {
    numOfWallets = parseInt(ctx.session.bundleDetails.bundlePercent);
  }
  const ethToAddToLP = parseInt(ctx.session.bundleDetails.ethToAddToLP);
  const ethToAddToLP2 = ethers.utils.parseEther(
    ctx.session.bundleDetails.ethToAddToLP
  );
  const buyTax = parseInt(ctx.session.bundleDetails.buyTax);
  const sellTax = parseInt(ctx.session.bundleDetails.sellTax);
  const percentageTokenToAddToLp = parseInt(
    ctx.session.bundleDetails.percentageTokenToAddToLp
  );
  const contractAddress = ctx.scene.state.contractAddress;
  const amountOfMinTokens = 0;
  const amountOfMinEth = 0;
  const addressToSendLPTo = ctx.session.bundleDetails.addressToSendLPTo;
  console.log(contractAddress);
  const tokenDetails = await Token.findOne({ contractAddress }).exec();
  if (!tokenDetails) {
    console.log("Token not found");
    return null;
  }
  const totalSupply = tokenDetails.totalSupply;
  const bundlePercent = ctx.session.bundleDetails.bundlePercent;

  const ethNeededToPurchaseTokens = calculatePriceForBundlePercent(
    ethToAddToLP,
    percentageTokenToAddToLp,
    bundlePercent,
    totalSupply
  );
  const amountOfTokenToAddToLp = floor(
    (totalSupply * percentageTokenToAddToLp) / 100
  );
  const ethPerWallet = ethNeededToPurchaseTokens / numOfWallets;
  console.log(ethNeededToPurchaseTokens);
  const now = Math.floor(Date.now() / 1000);
  try {
    let bundledWallets;
    if (ctx.session.randomWallets.toLowerCase() == "no" && walletAddresses) {
      bundledWallets = walletAddresses;
    } else {
      bundledWallets = await createBundledWallet(numOfWallets);
    }
    tokenDetails.bundledWallets = bundledWallets;
    await tokenDetails.save();

    let swapTransactions;

    // Create swap transactions
    if (ctx.session.randomWallets.toLowerCase() == "no" && walletAddresses) {
      swapTransactions = bundledWallets.map((wallet) => ({
        to: wallet,
        etherBuyAmount: ethers.utils.parseEther(ethPerWallet.toString()), // Convert ETH per wallet to wei
        minAmountToken: 0, // Set your required min token amount
        swapDeadline: Math.floor(Date.now() / 1000) + 3600, // Set deadline to 1 hour from current time
      }));
    } else {
      swapTransactions = bundledWallets.map((wallet) => ({
        to: wallet.address,
        etherBuyAmount: ethers.utils.parseEther(ethPerWallet.toString()), // Convert ETH per wallet to wei
        minAmountToken: 0, // Set your required min token amount
        swapDeadline: Math.floor(Date.now() / 1000) + 3600, // Set deadline to 1 hour from current time
      }));
    }

    console.log("Generated Swap Transactions: ", swapTransactions);
    const tokenDecimal = tokenDetails.tokenDecimal;

    const tokenAmount = ethers.BigNumber.from(amountOfTokenToAddToLp).mul(
      ethers.BigNumber.from(10).pow(tokenDecimal)
    );

    const bundled = await enableTradingAddLpPeformSwap(
      bundlerAddress,
      contractAddress,
      buyTax,
      sellTax,
      ethToAddToLP2,
      tokenAmount,
      amountOfMinTokens,
      amountOfMinEth,
      addressToSendLPTo,
      now,
      swapTransactions
    );

    ctx.reply(
      `Bundle successful, Check transaction using this transaction hash: ${bundled} `
    );
    ctx.scene.leave();
    ctx.scene.enter("tokenScene");

    // Here you can proceed with sending the transactions or processing them
  } catch (error) {
    console.error("Error bundling wallets or creating transactions: ", error);
  }
});

deployScene.action("deploy_token", async (ctx) => {
  const tokenName = ctx.session.tokenDetails.tokenName;
  const tokenSymbol = ctx.session.tokenDetails.tokenTicker;
  const tokenDecimals = ctx.session.tokenDetails.tokenDecimals;
  const totalSupply = ctx.session.tokenDetails.totalSupply;
  const taxWallet = ctx.session.tokenDetails.taxWallet;
  const privateKey = ctx.session.tokenDetails.privateKey;
  console.log("deploying the token");
  const userId = ctx.from.id;

  try {
    console.log("trying to deploying the token");
    const token = await deployToken(
      tokenName,
      tokenSymbol,
      totalSupply,
      tokenDecimals,
      taxWallet,
      privateKey
    );
    console.log(token);
    const newToken = new Token({
      userId: userId,
      name: tokenName,
      ticker: tokenSymbol,
      totalSupply: totalSupply,
      contractAddress: token.contractAddress,
      tokenDecimal: tokenDecimals,
      taxWallet: taxWallet,
      bundlerAddress: token.newBundlerAddress,
      adminKey: privateKey
    });
    ctx.session.tokenContractAddress = token.contractAddress;
    ctx.session.bundlerAddress = token.newBundlerAddress;
    await newToken.save();
    ctx.reply(
      `Token contract successfully deployed \n\n Contract address : ${token.contractAddress} \n\n bundler address: ${token.newBundlerAddress}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "proceed with bundle", callback_data: "bundle" }],
          ],
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
});
tokenScene.on("callback_query", async (ctx) => {
  const contractAddress = ctx.callbackQuery.data;
  ctx.session.contractAddress = ctx.callbackQuery.data;

  try {
    // Find the token associated with the contract address
    const token = await Token.findOne({ contractAddress }).exec();
    console.log(contractAddress);
    if (!token) {
      console.log("token not found");
      return null;
    }
    const buyTax = await getBuyTax(contractAddress, token.adminKey);
    const sellTax = await getSellTax(contractAddress, token.adminKey);

    if (token) {
      // Respond with token details
      ctx.replyWithHTML(
        `
<b>🔍 Token Details</b>
--------------------------------
<b> Name:</b> ${token.name}\n
<b>💹 Ticker:</b> ${token.ticker}\n
<b>💰 Total Supply:</b> ${token.totalSupply.toLocaleString()} \n
<b>🏦 Contract Address:</b> <code>${token.contractAddress}</code>\n
<b>📈 Buy Tax:</b> ${buyTax}%\n
<b>📉 Sell Tax:</b> ${sellTax}%\n
        `,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛠️ Update Tax",
                  callback_data: `updateTax|${token.contractAddress}`,
                },
                {
                  text: "🔑 Export Private Key",
                  callback_data: `export_pk|${token.contractAddress}`,
                },
              ],
              [
                {
                  text: "💸 Single Sell",
                  callback_data: `sell_holdings|${token.contractAddress}`,
                },
                {
                  text: "💼 Sell All Holdings‼️",
                  callback_data: `sell_all|${token.contractAddress}`,
                },
              ],
              [
                {
                  text: "Multi Sell",
                  callback_data: `simultaneous_sell|${token.contractAddress}`,
                },
                {
                  text: "Withdraw Tax",
                  callback_data: `withdraw_tax|${token.contractAddress}`,
                },
              ],
              [
                {
                  text: "Renounce contract",
                  callback_data: `renounce|${token.contractAddress}`,
                },
                {
                  text: "Back",
                  callback_data: `back_button|${token.contractAddress}`,
                },
              ],
            ],
          },
        }
      );
      ctx.scene.leave();
    } else {
      // If no token is found with the given contract address
      ctx.reply("❌ Token not found.");
      ctx.scene.leave();
    }
  } catch (error) {
    console.error("Error handling callback query:", error);
    ctx.reply(
      "⚠️ An error occurred while fetching token details. Please try again."
    );
  }
});

deployScene.action("bundle", async (ctx) => {
  await ctx.scene.enter("bundleScene", {
    contractAddress: ctx.session.tokenContractAddress,
    randomWallets: ctx.session.randomWallets,
    bundlerAddress: ctx.session.bundlerAddress,
  });
});

simultaneousScene.enter(async (ctx) => {
  const contractAddress = ctx.scene.state.contractAddress;
  ctx.session.contractAddress = contractAddress;
  console.log(contractAddress);
  const token = await Token.findOne({ contractAddress }).exec();
  if (!token) {
    console.log("token not found");
    return null;
  }

  const buyTax = await getBuyTax(contractAddress, token.adminKey);
  const sellTax = await getSellTax(contractAddress, token.adminKey);
  // Respond with token details
  ctx.replyWithHTML(
    `
<b>🔍 Token Details</b>
--------------------------------
<b> Name:</b> ${token.name}\n
<b>💹 Ticker:</b> ${token.ticker}\n
<b>💰 Total Supply:</b> ${token.totalSupply.toLocaleString()} \n
<b>🏦 Contract Address:</b> <code>${token.contractAddress}</code>\n
<b>💳 Number of Bundled wallets: ${token.bundledWallets.length} </b>
<b>📈 Buy Tax:</b> ${buyTax}%\n
<b>📉 Sell Tax:</b> ${sellTax}%\n
        `,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💳 Wallets 💳", callback_data: "wallets" }],
          [
            { text: "Sell 25%", callback_data: "sell_25" },
            { text: "Sell 50%", callback_data: "sell_50" },
            { text: "Sell 75%", callback_data: "sell_70" },
            { text: "Sell 100%", callback_data: "sell_100" },
          ],
          [
            { text: "Sell X%", callback_data: "sell_x" },
            { text: "Sell X ETH", callback_data: "sell_xeth" },
          ],
          [{ text: "back", callback_data: "back_button" }],
        ],
      },
    }
  );
});

simultaneousScene.on("callback_query", async (ctx) => {
  const contractAddress = ctx.session.contractAddress;
  const data = ctx.callbackQuery.data;

  if (data === "sell_25") {
    ctx.session.percentSell = 25;
    ctx.reply(
      "Please provide wallet where ETH gotten after sale would be sent to"
    );
    ctx.session.simultaneousStep = 1;
  } else if (data === "sell_50") {
    ctx.session.percentSell = 50;
    ctx.reply(
      "Please provide wallet where ETH gotten after sale would be sent to"
    );
    ctx.session.simultaneousStep = 1;
  } else if (data === "sell_75") {
    ctx.session.percentSell = 75;
    ctx.reply(
      "Please provide wallet where ETH gotten after sale would be sent to"
    );
    ctx.session.simultaneousStep = 1;
  } else if (data === "sell_100") {
    ctx.session.percentSell = 100;
    ctx.reply(
      "Please provide wallet where ETH gotten after sale would be sent to"
    );
    ctx.session.simultaneousStep = 1;
  } else if (data === "sell_x") {
    ctx.session.percentSell = "x";
    await ctx.reply("Please reply with the percentage of tokens to sell");
    ctx.session.simultaneousStep = 1;
  }
});

simultaneousScene.on("message", async (ctx) => {
  let simultaneousStep = ctx.session.simultaneousStep || 1;
  const contractAddress = ctx.session.contractAddress;
  let percentSell = ctx.session.percentSell;
  const token = await Token.findOne({contractAddress}).exec()

  if (
    percentSell == 25 ||
    percentSell == 50 ||
    percentSell == 75 ||
    percentSell == 100
  ) {
    const sendEthTo = ctx.message.text;
    ctx.reply(
      `Attempting to sell ${percentSell}% of tokens from all bundled wallets `
    );
    try {
      percentSell = percentSell * 10;
      const simHash = await bundleSell(token.bundlerAddress,contractAddress, sendEthTo, percentSell, token.adminKey);
      console.log(simHash);
      ctx.reply(`Sell transaction successful. Transaction Hash: ${simHash}`);
      await ctx.scene.leave()
      showStartMenu(ctx)
    } catch (error) {
      console.log(error);
      ctx.reply("Error selling tokens, please try again");
    }
  } else {
    switch (simultaneousStep) {
      case 1:
        // Step 1: Capture percentage of tokens to sell
        ctx.session.percentSell = ctx.message.text;
        ctx.reply(
          "Please provide the wallet where ETH obtained after sale will be sent."
        );
        ctx.session.simultaneousStep = 2; // Move to the next step
        break;

      case 2:
        const sendEthTo = ctx.message.text;

        // Ensure the percentSell is within a valid range (0 - 100)
        let percentSell = parseFloat(ctx.session.percentSell);

        // Log the percentage to sell
        ctx.reply(
          `Attempting to sell ${percentSell}% of tokens in all bundled wallets.`
        );

        // Attempt the sale using `bundleSell`
        try {
          // Adjust the percentage if needed (e.g., convert to a scale of 1000 or another multiplier)
          const adjustedPercentSell = percentSell * 10; // You can adjust this based on your requirements
          const simHash = await bundleSell(
            token.bundlerAddress,
            contractAddress,
            sendEthTo,
            adjustedPercentSell,
            token.adminKey
          );

          // Confirm the successful transaction
          console.log("Simultaneous Sell Transaction Hash:", simHash);
          ctx.reply(
            `Sell transaction successful. Transaction Hash: <code>${simHash}</code>`,
            { parse_mode: "HTML" }
          );
           await ctx.scene.leave()
          showStartMenu(ctx)
        } catch (error) {
          // Handle any errors in the selling process
          console.error("Error during simultaneous sell:", error);
          ctx.reply("❌ Error selling tokens. Please try again.");
        }
        break;

      default:
        // Handle unexpected steps
        ctx.reply("Invalid step in the selling process.");
        ctx.session.simultaneousStep = 1;
        ctx.scene.leave();
        break;
    }
  }
});

holdingsScene.enter(async (ctx) => {
  const contractAddress = ctx.scene.state.contractAddress;
  ctx.session.contractAddress = contractAddress;
  console.log(contractAddress);
  const token = await Token.findOne({ contractAddress }).exec();
  if (!token) {
    console.log("token not found");
    return null;
  }

  const buyTax = await getBuyTax(contractAddress, token.adminKey);
  const sellTax = await getSellTax(contractAddress, token.adminKey);
  // Respond with token details
  ctx.replyWithHTML(
    `
<b>🔍 Token Details</b>
--------------------------------
<b> Name:</b> ${token.name}\n
<b>💹 Ticker:</b> ${token.ticker}\n
<b>💰 Total Supply:</b> ${token.totalSupply.toLocaleString()} \n
<b>🏦 Contract Address:</b> <code>${token.contractAddress}</code>\n
<b>💳 Number of Bundled wallets: ${token.bundledWallets.length} </b>
<b>📈 Buy Tax:</b> ${buyTax}%\n
<b>📉 Sell Tax:</b> ${sellTax}%\n
        `,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💳 Wallets 💳", callback_data: "wallets" }],
          [
            { text: "Sell 25%", callback_data: "sell_25" },
            { text: "Sell 50%", callback_data: "sell_50" },
            { text: "Sell 75%", callback_data: "sell_75" },
            { text: "Sell 100%", callback_data: "sell_100" },
          ],
          [
            { text: "Sell X%", callback_data: "sell_x" },
            { text: "Sell X ETH", callback_data: "sell_xeth" },
          ],
          [{ text: "back", callback_data: "back_button" }],
        ],
      },
    }
  );
});
holdingsScene.on("callback_query", async (ctx) => {
  const contractAddress = ctx.session.contractAddress;
  const data = ctx.callbackQuery.data;

  if (data === "sell_25") {
    ctx.session.percentSell = 25;
    await handleSell25(ctx, contractAddress);
  } else if (data === "sell_50") {
    ctx.session.percentSell = 50;
    await handleSell25(ctx, contractAddress);
  } else if (data === "sell_75") {
    ctx.session.percentSell = 75;
    await handleSell25(ctx, contractAddress);
  } else if (data === "sell_100") {
    ctx.session.percentSell = 100;
    await handleSell25(ctx, contractAddress);
  } else if (data === "sell_x") {
    ctx.session.percentSell = "x";
    ctx.session.holdingsStep = 1;
    await ctx.reply("Please reply with the percentage of tokens to sell");
  } else if (data.startsWith("wallets_page_")) {
    const page = parseInt(data.split("_").pop(), 10);
    await handleSell25(ctx, contractAddress, page); // Show the requested page
  } else if (data.startsWith("select_wallet_")) {
    const selectedWalletAddress = data.split("_").pop();
    ctx.session.selectedWalletAddress = selectedWalletAddress;
    const percentSell = ctx.session.percentSell;
    ctx.reply(
      "Please provide wallet where ETH gotten after sale would be sent to"
    );
  } else if (data === "back_button") {
    ctx.deleteMessage();
  }
});

holdingsScene.on("message", async (ctx) => {
  const holdingsStep = ctx.session.holdingsStep || 1;
  const contractAddress = ctx.session.contractAddress;
  const selectedWalletAddress = ctx.session.selectedWalletAddress;
  let percentSell = ctx.session.percentSell;
  const token = await Token.findOne({contractAddress}).exec()
  const now = Math.floor(Date.now() / 1000);
  console.log(selectedWalletAddress);
  if (
    percentSell == 25 ||
    percentSell == 50 ||
    percentSell == 75 ||
    percentSell == 100
  ) {
    const sendEthTo = ctx.message.text;
    percentSell = percentSell * 10;
    ctx.reply(
      `Attempting to sell ${
        percentSell / 10
      }% of token from ${selectedWalletAddress} `
    );
    try {
      const sellHash = await sellTokensInAddress(
        token.bundlerAddress,
        contractAddress,
        selectedWalletAddress,
        percentSell,
        sendEthTo,
        token.adminKey
      );
      console.log(sellHash);
      ctx.reply(`Sell transaction successful. Transaction Hash: ${sellHash}`);
       await ctx.scene.leave()
       showStartMenu(ctx)
    } catch (error) {
      console.log(error);
      ctx.reply("Error selling tokens, please try again");
    }
  } else if (percentSell === "x") {
    switch (holdingsStep) {
      case 1:
        ctx.session.percentSell = ctx.message.text;
        await handleSell25(ctx, contractAddress);
        ctx.session.holdingsStep = 2;
        break;
    }
  } else {
    try {
      percentSell = percentSell * 10;
      const sendEthTo = ctx.message.text;
      if (!isValidEthereumAddress(sendEthTo)) {
        await ctx.reply(
          "Invalid Ethereum wallet address. Please provide a valid Ethereum address."
        );
        return;
      }
      const sellHash = await sellTokensInAddress(
        token.bundlerAddress,
        contractAddress,
        selectedWalletAddress,
        percentSell,
        sendEthTo,
        token.adminKey
      );
      console.log(sellHash);
      ctx.reply(`Sell transaction successful. Transaction Hash: ${sellHash}`);
      await ctx.scene.leave()
      showStartMenu(ctx)
    } catch (error) {
      console.log(error);
      ctx.reply("Error selling tokens, please try again");
    }
  }
});

sellAllScene.enter(async (ctx) => {
  const contractAddress = ctx.scene.state.contractAddress;
  ctx.session.contractAddress = contractAddress;

  ctx.reply(
    "Please provide wallet where ETH gotten after sale would be sent to"
  );
});

sellAllScene.on("message", async (ctx) => {
  const sendEthTo = ctx.message.text;
 
  if (!isValidEthereumAddress(sendEthTo)) {
    await ctx.reply(
      "Invalid Ethereum wallet address. Please provide a valid Ethereum address."
    );
    return;
  }
  const contractAddress = ctx.session.contractAddress;
  const token = await Token.findOne({contractAddress}).exec()
  await ctx.reply(`Attempting to sell tokens from all bundle wallets...`);
  const percentToSell = 100 * 10;
  try {
    const sellTxHash = await bundleSell(
      token.bundlerAddress,
      contractAddress,
      sendEthTo,
      percentToSell,
      token.adminKey
    );
    console.log(sellTxHash);
    ctx.reply(`Sell transaction successful. Transaction Hash: ${sellTxHash}`);
      await ctx.scene.leave()
      showStartMenu(ctx)
  } catch (error) {
    console.log(error);
    ctx.reply("Error selling all tokens");
  }
});

taxScene.enter(async (ctx) => {
  const contractAddress = ctx.scene.state.contractAddress;
  ctx.session.contractAddress = contractAddress;

  ctx.reply("please provide new buy tax value");

  ctx.session.taxSteps = 1;
});

taxScene.on("message", async (ctx) => {
  const taxStep = ctx.session.taxSteps || 1;
  const contractAddress = ctx.session.contractAddress;
  const token = await Token.findOne({contractAddress}).exec()

  switch (taxStep) {
    case 1:
      ctx.session.buyTax = ctx.message.text;
      ctx.reply("Please provide sell tax value");
      ctx.session.taxSteps = 2;
      break;

    case 2:
      ctx.session.selltax = ctx.message.text;
      ctx.reply("Updating tax.....");
      const taxTx = await updateTaxes(
        token.bundlerAddress,
        contractAddress,
        ctx.session.buyTax,
        ctx.session.selltax,
        token.adminKey
      );
      ctx.reply(`Tax sucessfully updated, tx hash : ${taxTx}`);
       await ctx.scene.leave()
      showStartMenu(ctx)
      break;

    default:
      ctx.reply("Unexpected input. Please follow the conversation flow.");
      ctx.session.stepCount = null;
      ctx.scene.leave();
      break;
  }
});

bot.start(async (ctx) => {
  const allowedAdmins = [
    "P4ALPHA",
    "MC_GBHF",
    "Habibilord",
    "KnowledgeJO",
    "TheBlockchainBeast",
  ];
  const username = ctx.from.username;

  if (allowedAdmins.includes(username)) {
    ctx.reply(`Hi ${username}, \n\n Welcome to the ETH bundler bot`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Deploy Token", callback_data: "deploy" },
            { text: "Tokens", callback_data: "tokendeets" },
          ],
          [{ text: "Wallet", callback_data: "wallet" }],
          [
            { text: "Support", callback_data: "support" },
            { text: "Settings", callback_data: "settings" },
          ],
        ],
      },
    });
  } else {
    ctx.reply("You do not have permission to use this bot.");
  }
});

bot.action("deploy", async (ctx) => {
  ctx.scene.enter("deployScene");
});
bot.action("tokendeets", async (ctx) => {
  ctx.scene.enter("tokenScene");
});
bot.action("wallet", async (ctx) => {
  ctx.scene.enter("walletScene");
});
walletScene.action("import_wallet", async (ctx) => {
  ctx.scene.enter("addWalletScene");
});
deployScene.on("callback_query", handleSkip);
bot.action("delete_message", async (ctx) => {
  ctx.deleteMessage();
});
bot.on("callback_query", async (ctx) => {
  const callback_query = ctx.callbackQuery.data;
  const [action, contractAddress] = callback_query.split("|"); // Split the callback data into action and contract address

  console.log("contract address for query", contractAddress);

  ctx.session.contractAddress = contractAddress;

  if (action === "back_button") {
    ctx.deleteMessage();
  } else if (action === "updateTax") {
    ctx.scene.enter("taxScene", {
      contractAddress: ctx.session.contractAddress,
    });
  } else if (action === "sell_holdings") {
    ctx.scene.enter("holdingsScene", {
      contractAddress: ctx.session.contractAddress,
    });
  } else if (action === "sell_all") {
    ctx.scene.enter("sellAllScene", {
      contractAddress: ctx.session.contractAddress,
    });
  } else if (action === "simultaneous_sell") {
    ctx.scene.enter("simultaneousScene", {
      contractAddress: ctx.session.contractAddress,
    });
  } else if (action === "withdraw_tax") {
    const contractAddress = ctx.session.contractAddress;
    const token = await Token.findOne({ contractAddress }).exec();

    if (!token) {
      ctx.reply("Token not found");
      return;
    }
    ctx.reply("Withdrawing tax...");
    try {
      const taxHash = await withdrawTax(contractAddress, token.taxWallet, token.adminKey);
      console.log(taxHash);
      ctx.reply(`Tax withdrawal successful, Tx Hash: ${taxHash}`);
    } catch (error) {
      console.log(error);
      ctx.reply("error withdrawing tax");
    }
  } else if (action === "export_pk") {
    ctx.reply("Exporting bundled wallet private keys....");
    const contractAddress = ctx.session.contractAddress;
    const token = await Token.findOne({ contractAddress }).exec();

    if (!token) {
      ctx.reply("Token not found");
      return;
    }

    try {
      // Export the private keys to a CSV file
      const filePath = await exportPrivateKey(token.bundledWallets, token.name);

      // Send the exported file to the user
      await ctx.replyWithDocument({ source: filePath });

      ctx.reply("Bundle wallet private keys exported successfully.");
    } catch (error) {
      console.error("Error exporting bundle wallet private keys:", error);
      ctx.reply(
        "Error exporting bundle wallet private keys, please try again."
      );
    }
  } else if (action === "renounce") {
    ctx.reply("renouncing contract");
    const token= await Token.findOne({contractAddress}).exec()
    try {
      const renounceTx = await renounce(token.bundlerAddress, contractAddress, token.adminKey);
      console.log(renounceTx);
      ctx.reply(`Contract successfully revoked, tx hash: ${renounceTx}`);
    } catch (error) {
      console.log(error);
      ctx.reply("error renouncing contract");
    }
  }
});

const showStartMenu = async(ctx)=>{
  const allowedAdmins = [
    "P4ALPHA",
    "MC_GBHF",
    "Habibilord",
    "KnowledgeJO",
    "TheBlockchainBeast",
  ];
  const username = ctx.from.username;

  if (allowedAdmins.includes(username)) {
    ctx.reply(`Hi ${username}, \n\n Welcome to the ETH bundler bot`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Deploy Token", callback_data: "deploy" },
            { text: "Tokens", callback_data: "tokendeets" },
          ],
          [{ text: "Wallet", callback_data: "wallet" }],
          [
            { text: "Support", callback_data: "support" },
            { text: "Settings", callback_data: "settings" },
          ],
        ],
      },
    });
  } else {
    ctx.reply("You do not have permission to use this bot.");
  }
}

bot.launch();
