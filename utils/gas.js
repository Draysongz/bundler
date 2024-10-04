async function priorityGas(signer) {
  const feeData = await signer.getFeeData();

  const gasPrice = Number(feeData.gasPrice);
  const maxFeePerGas = Number(feeData.maxFeePerGas) + gasPrice;
  const maxPriorityFeePerGas = Number(feeData.maxPriorityFeePerGas) + gasPrice;
  console.log({
    maxFeePerGas: Number(feeData.maxFeePerGas),
    maxPriorityFeePerGas: Number(feeData.maxPriorityFeePerGas),
    gasPrice,
  });
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

module.exports = {
  priorityGas,
};
