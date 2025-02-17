import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './GaslessTransfer.css';

const TOKEN_ADDRESS = "0xC76C421858A3adfd1473Ff4029a69F3Bc3446c7E";
const FORWARDER_ADDRESS = "0x316560d3927a5f5Bef7e4F7B4FC3206d03D409F9";

const GaslessTransfer = () => {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');
  const [allowance, setAllowance] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkConnection);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkConnection);
      }
    };
  }, []);

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setConnected(true);
          setAccount(accounts[0]);
          await updateBalance(accounts[0], provider);
          await updateAllowance(accounts[0], provider);
          await updateEthBalance(accounts[0], provider); // Fetch ETH balance
        } else {
          setConnected(false);
          setAccount('');
        }
      }
    } catch (error) {
      console.error('Connection check failed:', error);
    }
  };

  const updateBalance = async (address, provider) => {
    try {
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const bal = await tokenContract.balanceOf(address);
      setBalance(ethers.utils.formatEther(bal));
    } catch (error) {
      console.error('Balance check failed:', error);
    }
  };

  const updateAllowance = async (address, provider) => {
    try {
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        ['function allowance(address owner, address spender) view returns (uint256)'],
        provider
      );
      const allowance = await tokenContract.allowance(address, FORWARDER_ADDRESS);
      setAllowance(ethers.utils.formatEther(allowance));
    } catch (error) {
      console.error('Allowance check failed:', error);
    }
  };

  const updateEthBalance = async (address, provider) => {
    try {
      const balance = await provider.getBalance(address);
      setEthBalance(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error('ETH balance check failed:', error);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus('Please install MetaMask!');
        return;
      }
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const accounts = await provider.listAccounts();
      setAccount(accounts[0]);
      setConnected(true);
      await updateBalance(accounts[0], provider);
      await updateAllowance(accounts[0], provider);
      await updateEthBalance(accounts[0], provider); // Fetch ETH balance
    } catch (error) {
      setStatus('Failed to connect wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveRelayer = async () => {
    try {
      setLoading(true);
      setStatus('Approving relayer...');

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );

      // Approve the relayer to spend tokens on behalf of the user
      const tx = await tokenContract.approve(FORWARDER_ADDRESS, ethers.constants.MaxUint256);
      await tx.wait();

      setStatus('Relayer approved successfully!');
      await updateAllowance(account, provider); // Update the allowance in the UI
    } catch (error) {
      setStatus('Approval failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!ethers.utils.isAddress(toAddress)) {
      setStatus('Invalid recipient address');
      return;
    }

    try {
      setLoading(true);
      setStatus('Preparing transaction...');

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Check the relayer's allowance
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        ['function allowance(address owner, address spender) view returns (uint256)'],
        provider
      );
      const allowance = await tokenContract.allowance(account, FORWARDER_ADDRESS);
      if (allowance.lt(ethers.utils.parseEther(amount))) {
        setStatus('Insufficient allowance. Please approve the relayer first.');
        return;
      }

      // Proceed with the gasless transfer
      const forwarderContract = new ethers.Contract(
        FORWARDER_ADDRESS,
        ['function nonces(address) view returns (uint256)'],
        provider
      );
      const nonce = await forwarderContract.nonces(account);

      const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256', 'uint256', 'address'],
        [TOKEN_ADDRESS, toAddress, ethers.utils.parseEther(amount), nonce, FORWARDER_ADDRESS]
      );

      setStatus('Please sign the message...');
      const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

      setStatus('Sending to relayer...');
      const response = await fetch('http://localhost:3001/relay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenContract: TOKEN_ADDRESS,
          to: toAddress,
          amount: ethers.utils.parseEther(amount).toString(),
          nonce: nonce.toString(),
          signature
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus(`Transaction successful! Hash: ${data.txHash}`);
        setAmount('');
        setToAddress('');
        await updateBalance(account, provider);
      } else {
        setStatus('Transaction failed: ' + data.error);
      }
    } catch (error) {
      setStatus('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gasless-container">
      <div className="logo-container">
        <img src="logo.png" alt="Team Logo" className="logo" />
      </div>
      {!connected ? (
        <button className="button approve-button" onClick={connectWallet} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <>
          <div className="wallet-card">
            <div className="wallet-address">
              <strong>Account </strong> : {account}
            </div>
            <div className="token-info">
              <div className="token-box">
                <div className="token-label">ETH Balance</div>
                <div className="token-value">
                  {Number(ethBalance).toLocaleString(undefined, {
                    maximumFractionDigits: 4
                  })} ETH
                </div>
              </div>
              <div className="token-box">
                <div className="token-label">Balance</div>
                <div className="token-value">
                  {Number(balance).toLocaleString(undefined, {
                    maximumFractionDigits: 6
                  })} tokens
                </div>
              </div>
              <div className="token-box">
                <div className="token-label">Allowance</div>
                <div className="token-value allowance-value">
                  {Number(allowance).toLocaleString(undefined, {
                    maximumFractionDigits: 6
                  })} tokens
                </div>
              </div>
            </div>
          </div>

          <div className="input-field-container">
            <div className="input-field">
              <input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Recipient Address"
              />
            </div>

            <div className="input-field">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
              />
            </div>
          </div>

          <button
            className="button approve-button"
            onClick={approveRelayer}
            disabled={loading}
          >
            {loading ? 'Approving...' : 'Approve Relayer'}
          </button>

          <button
            className="button transfer-button"
            onClick={handleTransfer}
            disabled={loading || !amount || !toAddress}
          >
            {loading ? 'Sending...' : 'Send Transaction'}
          </button>
        </>
      )}

      {status && <div className="status-message">{status}</div>}
    </div>
  );
};

export default GaslessTransfer;
