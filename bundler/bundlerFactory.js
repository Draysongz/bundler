const { ethers } = require("ethers");
const bundlerABI = require("../ABIs/Bundler.json");
const bundlerBytecode = require("../bytecode/Bundler.json");

async function createNewBundler(signer, adminAddress, coAdminAddress) {
  const Bundler = new ethers.ContractFactory(
    bundlerABI,
    bundlerBytecode.bundlerBytecode,
    signer
  );

  const bundler = await Bundler.deploy(
  adminAddress,
  coAdminAddress, 
  {
    gasLimit: 4000000, 
  }
);

  await bundler.deployTransaction.wait();

  const deployedBundlerContractAddress = bundler.address;
  return deployedBundlerContractAddress;
}

// async function createNewBundler(
//   signer,
//   bundlerFactoryABI,
//   bundlerFactoryAddress,
//   adminAddress,
//   coAdminAddress
// ) {
//   const bundlerFC = bundlerFactoryContract(
//     signer,
//     bundlerFactoryABI,
//     bundlerFactoryAddress
//   );

//   const tx = await bundlerFC.createBundler(adminAddress, coAdminAddress);
//   const receipt = await tx.wait();

//   const deployedBundlerContractAddress = receipt.events[0].args[0];

//   return deployedBundlerContractAddress;
// }

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
