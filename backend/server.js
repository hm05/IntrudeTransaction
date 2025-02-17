require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ethers = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

// Load environment variables
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const ALCHEMY_URL = process.env.ALCHEMY_URL;
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;

// Setup provider and wallet
const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_URL);
const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

app.post('/relay', async (req, res) => {
    try {
        const { tokenContract, to, amount, nonce, signature } = req.body;
        
        console.log('Received relay request:', { tokenContract, to, amount, nonce });

        const forwarderABI = [
            "function forward(address tokenContract, address to, uint256 amount, uint256 nonce, bytes memory signature) external"
        ];

        const forwarder = new ethers.Contract(FORWARDER_ADDRESS, forwarderABI, wallet);

        console.log('Submitting transaction...');
        const tx = await forwarder.forward(tokenContract, to, amount, nonce, signature);
        console.log('Transaction submitted:', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt.transactionHash);

        res.json({ 
            success: true, 
            txHash: receipt.transactionHash 
        });
    } catch (error) {
        console.error('Relay error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});