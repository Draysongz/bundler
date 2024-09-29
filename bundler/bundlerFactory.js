const { ethers } = require("ethers");

async function createNewBundler(
  signer,
  bundlerFactoryABI,
  bundlerFactoryAddress,
  adminAddress,
  coAdminAddress
) {
  const bundlerFC = bundlerFactoryContract(
    signer,
    bundlerFactoryABI,
    bundlerFactoryAddress
  );

  // const estimatedGas = await bundlerFC.estimateGas.createBundler(adminAddress, coAdminAddress)
  //  console.log("Estimated gas for bundler creation:", estimatedGas.toString());
  const tx = await bundlerFC.createBundler(adminAddress, coAdminAddress, );

  const receipt = await tx.wait();
  console.log("receipt",receipt)
  console.log(receipt.events[0].args[0])

  const deployedBundlerContractAddress = receipt.events[0].args[0];

  return deployedBundlerContractAddress;
}

async function getDeployedBundler(
  signer,
  bundlerFactoryABI,
  bundlerFactoryAddress,
  bundlerAddress
) {
  const bundlerFC = bundlerFactoryContract(
    signer,
    bundlerFactoryABI,
    bundlerFactoryAddress
  );

  const bundler = await bundlerFC.getBundlerByAddress(bundlerAddress);

  return bundler;
}

async function getUserBundlers(
  signer,
  bundlerFactoryABI,
  bundlerFactoryAddress
) {
  const bundlerFC = bundlerFactoryContract(
    signer,
    bundlerFactoryABI,
    bundlerFactoryAddress
  );

  const bundlers = await bundlerFC.getBundlers();

  return bundlers;
}

function bundlerFactoryContract(
  signer,
  bundlerFactoryABI,
  bundlerFactoryAddress
) {
  const bundlerFC = new ethers.Contract(
    bundlerFactoryAddress,
    bundlerFactoryABI,
    signer
  );

  return bundlerFC;
}

module.exports = { createNewBundler, getDeployedBundler, getUserBundlers };
