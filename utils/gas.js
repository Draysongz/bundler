const { ethers } = require("ethers");

async function priorityGas(signer) {
  const feeData = await signer.getFeeData();

  const gasPrice = Number(feeData.gasPrice);
  const maxFeePerGas = Number(feeData.maxFeePerGas) + gasPrice;
  const maxPriorityFeePerGas = Number(feeData.maxPriorityFeePerGas) + gasPrice;

  return { maxFeePerGas, maxPriorityFeePerGas, gasPrice };
}

function operation(a, b, operator) {
  if (operator === "+") {
    return a + b;
  }

  if (operator === "*") {
    return a * b;
  }
}

async function calcGas(signer, gasUnit) {
  const { maxFeePerGas } = await priorityGas(signer);
  const gasInGwei = ethers.utils.formatUnits(maxFeePerGas, "9");
  const totalCost = gasInGwei * gasUnit;
  let toWei = totalCost * (1 * 10 ** 18);
  toWei = toWei / (1 * 10 ** 9);
  const toEther = ethers.utils.formatUnits(BigInt(toWei), "18");

  return toEther;
}

module.exports = {
  priorityGas,
  calcGas,
};
