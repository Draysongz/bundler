const handleBundleStep1 = async (ctx) => {
  ctx.session.bundleDetails.buyTax = ctx.message.text;
  ctx.reply("Please provide value for sell tax");

  ctx.session.bundleSteps = 2;
};

const handleBundleStep2 = async (ctx) => {
  ctx.session.bundleDetails.sellTax = ctx.message.text;
  ctx.reply("Please reply with the amount of ETH to add to lp");
  ctx.session.bundleSteps = 3;
};

const handleBundleStep3 = async (ctx) => {
  ctx.session.bundleDetails.ethToAddToLP = ctx.message.text;
  ctx.reply("Please reply with the percentage of token to add to lp");
  ctx.session.bundleSteps = 4;
};

const handleBundleStep4 = async (ctx) => {
  ctx.session.bundleDetails.percentageTokenToAddToLp = ctx.message.text;
  ctx.reply("Please provide address to send lp tokens to ");
  ctx.session.bundleSteps = 5;
};

const handleBundleStep5 = async (ctx) => {
  ctx.session.bundleDetails.addressToSendLPTo = ctx.message.text;
  ctx.reply(
    "Please provide percent of the supply to buy with bundle wallets. \n\n Example: 50% supply = 50"
  );

  ctx.session.bundleSteps = 6;
};

const handleBundleStep6 = async (ctx) => {
  // Validate the bundle percentage
  const bundlePercent = parseFloat(ctx.message.text);

  if (isNaN(bundlePercent) || bundlePercent <= 0 || bundlePercent > 100) {
    ctx.reply("Please enter a valid percentage (between 1 and 100)");
    return;
  }

  // Store the validated bundle percentage in the session
  ctx.session.bundleDetails.bundlePercent = bundlePercent;

  // Prompt user to send the list of wallet addresses
  if (ctx.session.randomWallets.toLowerCase() == "no") {
    ctx.reply(
      "Please send the list of wallet addresses for the bundle. Each wallet address should be separated by a comma or new line."
    );
    ctx.session.bundleSteps = 7;
  } else {
    // Display collected  details for confirmation
    const {
      buyTax,
      sellTax,
      ethToAddToLP,
      percentageTokenToAddToLp,
      addressToSendLPTo,
      bundlePercent,
    } = ctx.session.bundleDetails;

    await ctx.replyWithHTML(
      `<b>Confirm the Bundle Details:</b>
Buy Tax: ${buyTax}%
Sell Tax: ${sellTax}%
ETH to Add to LP: ${ethToAddToLP}
Token Percent to add to LP: ${percentageTokenToAddToLp}%
Address to send LP tokens to: ${addressToSendLPTo}
Bundle Percent: ${bundlePercent}%`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Proceed with Bundle",
                callback_data: "confirm_bundle",
              },
            ],
            [{ text: "Simulate Bundle", callback_data: "simulate_bundle" }],
          ],
        },
      }
    );
  }
};

const handleBundleStep7 = async (ctx) => {
  const walletAddressesInput = ctx.message.text;

  // Split the input by commas or new lines
  const walletAddresses = walletAddressesInput
    .split(/[\n,]+/)
    .map((address) => address.trim())
    .filter((address) => address.length > 0);

  if (walletAddresses.length === 0) {
    ctx.reply("Please provide a valid list of wallet addresses.");
    return;
  }

  // Store the wallet addresses in the session
  ctx.session.bundleDetails.walletAddresses = walletAddresses;

  // Display collected  details for confirmation
  const {
    buyTax,
    sellTax,
    ethToAddToLP,
    percentageTokenToAddToLp,
    addressToSendLPTo,
    bundlePercent,
  } = ctx.session.bundleDetails;

  await ctx.replyWithHTML(
    `<b>Confirm the Bundle Details:</b>
Buy Tax: ${buyTax}%
Sell Tax: ${sellTax}%
ETH to Add to LP: ${ethToAddToLP}
Token Percent to add to LP: ${percentageTokenToAddToLp}%
Address to send LP tokens to: ${addressToSendLPTo}
Bundle Percent: ${bundlePercent}%`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Proceed with Bundle",
              callback_data: "confirm_bundle",
            },
          ],
          [{ text: "Simulate Bundle", callback_data: "simulate_bundle" }],
        ],
      },
    }
  );
};

module.exports = {
  handleBundleStep1,
  handleBundleStep2,
  handleBundleStep3,
  handleBundleStep4,
  handleBundleStep5,
  handleBundleStep6,
  handleBundleStep7,
};
