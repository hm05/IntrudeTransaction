const MyToken = artifacts.require("MyToken");
const GaslessForwarder = artifacts.require("GaslessForwarder");

module.exports = function (deployer, network, accounts) {
  if (network === "sepolia") {
    const relayerAddress = accounts[0];
    deployer.deploy(MyToken, 1000000).then(() => {
      return deployer.deploy(GaslessForwarder, relayerAddress);
    });
  } else {
    deployer.deploy(MyToken, 1000000).then(() => {
      return deployer.deploy(GaslessForwarder, accounts[0]);
    });
  }
};