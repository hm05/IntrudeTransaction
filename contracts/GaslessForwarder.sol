// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GaslessForwarder {
    using ECDSA for bytes32;

    address public relayer;
    mapping(address => uint256) public nonces;

    event TransactionForwarded(
        address indexed user,
        address indexed tokenContract,
        address indexed to,
        uint256 amount,
        uint256 nonce
    );

    constructor(address _relayer) {
        relayer = _relayer;
    }

    function forward(
        address tokenContract,
        address to,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) external {
        require(msg.sender == relayer, "Only relayer can forward");

        bytes32 messageHash = keccak256(abi.encodePacked(tokenContract, to, amount, nonce, address(this)));

        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address signer = ECDSA.recover(ethSignedMessageHash, signature);

        require(nonces[signer] == nonce, "Invalid nonce");

        nonces[signer]++;

        uint256 allowance = IERC20(tokenContract).allowance(signer, address(this));
        require(allowance >= amount, "Insufficient allowance");

        IERC20(tokenContract).transferFrom(signer, to, amount);
        emit TransactionForwarded(signer, tokenContract, to, amount, nonce);
    }
}