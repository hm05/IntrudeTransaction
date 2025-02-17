const HDWalletProvider = require("@truffle/hdwallet-provider");
const mnemonic = "surprise tenant juice crystal artwork pond inform vapor click caught rally tunnel"; // Replace with your Metamask mnemonic

module.exports = {
  networks: {
    sepolia: {
      provider: () => new HDWalletProvider(mnemonic, "https://eth-sepolia.g.alchemy.com/v2/8SpOm-MvRcOKtk8cIQKN9e1w9tw_yNTh"),
      network_id: 11155111,
      gas: 5500000,
      gasPrice: 3000000000, // 3 Gwei
      timeoutBlocks: 500,
      networkCheckTimeout: 30000,
    },
    holesky: {
      provider: () => new HDWalletProvider(mnemonic, "https://eth-holesky.g.alchemy.com/v2/8SpOm-MvRcOKtk8cIQKN9e1w9tw_yNTh"),
      network_id: 17000,
      gas: 5500000,
    },
  },
  compilers: {
    solc: {
      version: "0.8.20",
    },
  },
};