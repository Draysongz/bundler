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

  const tx = await bundlerFC.createBundler(adminAddress, coAdminAddress);
  const receipt = await tx.wait();

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

module.exports = { createNewBundler, getDeployedBundler };
