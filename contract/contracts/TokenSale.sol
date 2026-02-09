// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;


import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol"; 
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Token.sol";


// FE-4: Ownable2Step + owner withdrawals for ETH and ERC20
contract TokenSale is Ownable2Step, ReentrancyGuard {
    // Custom errors for gas efficiency
    error InsufficientETH();
    error InsufficientTokens();
    error InsufficientContractBalance();
    error TransferFailed();
    error ZeroAmount();
    error InvalidPrice();

    // State variables
    Token public immutable token;
    uint256 public buyPrice;   // Price in wei to buy 1 token (e.g., 0.001 ETH)
    uint256 public sellPrice;  // Price in wei to sell 1 token (e.g., 0.0005 ETH)

    // Events
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event TokensSold(address indexed seller, uint256 amount, uint256 refund);
    event PricesUpdated(uint256 newBuyPrice, uint256 newSellPrice);
    event ETHWithdrawn(address indexed owner, uint256 amount);
    event TokensWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev Constructor initializes the token sale contract
     * @param _token Address of the ERC20 token contract
     * @param _buyPrice Price in wei to buy 1 token (e.g., 1e15 for 0.001 ETH)
     * @param _sellPrice Price in wei to sell 1 token (e.g., 5e14 for 0.0005 ETH)
     */
    constructor(
        address _token,
        uint256 _buyPrice,
        uint256 _sellPrice
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert InvalidPrice();
        if (_buyPrice == 0 || _sellPrice == 0) revert InvalidPrice();
        if (_sellPrice >= _buyPrice) revert InvalidPrice(); // Sell price should be less than buy price

        token = Token(_token);
        buyPrice = _buyPrice;
        sellPrice = _sellPrice;
    }

    /**
     * @dev Buy tokens with ETH
     * Uses contract reserves first, then mints if needed
     * @param tokenAmount Amount of tokens to buy
     */
    function buyTokens(uint256 tokenAmount) external payable nonReentrant {
        if (tokenAmount == 0) revert ZeroAmount();

        uint256 cost = (tokenAmount * buyPrice) / 1e18;
        if (msg.value < cost) revert InsufficientETH();

        // Check contract's token balance
        uint256 contractBalance = token.balanceOf(address(this));

        if (contractBalance >= tokenAmount) {
            // Use existing reserves
            require(token.transfer(msg.sender, tokenAmount), "Transfer failed");
        } else {
            // Transfer available reserves if any
            if (contractBalance > 0) {
                require(token.transfer(msg.sender, contractBalance), "Transfer failed");
            }

            // Mint remaining tokens
            uint256 tokensToMint = tokenAmount - contractBalance;
            token.mint(msg.sender, tokensToMint);
        }

        // Refund excess ETH
        if (msg.value > cost) {
            (bool success, ) = msg.sender.call{value: msg.value - cost}("");
            if (!success) revert TransferFailed();
        }

        emit TokensPurchased(msg.sender, tokenAmount, cost);
    }

    /**
     * @dev Sell tokens for ETH
     * Tokens are transferred to the contract for resale
     * @param tokenAmount Amount of tokens to sell
     */
    function sellTokens(uint256 tokenAmount) external nonReentrant {
        if (tokenAmount == 0) revert ZeroAmount();

        uint256 refund = (tokenAmount * sellPrice) / 1e18;

        // Check contract has enough ETH
        if (address(this).balance < refund) revert InsufficientContractBalance();

        // Transfer tokens from seller to contract
        require(
            token.transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );

        // Send ETH to seller
        (bool success, ) = msg.sender.call{value: refund}("");
        if (!success) revert TransferFailed();

        emit TokensSold(msg.sender, tokenAmount, refund);
    }

    /**
     * @dev Update buy and sell prices (only owner)
     * @param _buyPrice New buy price in wei
     * @param _sellPrice New sell price in wei
     */
    function updatePrices(uint256 _buyPrice, uint256 _sellPrice) external onlyOwner {
        if (_buyPrice == 0 || _sellPrice == 0) revert InvalidPrice();
        if (_sellPrice >= _buyPrice) revert InvalidPrice();

        buyPrice = _buyPrice;
        sellPrice = _sellPrice;

        emit PricesUpdated(_buyPrice, _sellPrice);
    }

    /**
     * @dev Withdraw ERC20 tokens from contract (only owner)
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 contractBalance = token.balanceOf(address(this));
        if (contractBalance < amount) revert InsufficientTokens();

        require(token.transfer(owner(), amount), "Token transfer failed");

        emit TokensWithdrawn(owner(), amount);
    }

    /**
     * @dev Withdraw ETH from contract (only owner)
     * @param amount Amount of ETH to withdraw in wei
     */
    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientContractBalance();

        (bool success, ) = owner().call{value: amount}("");
        if (!success) revert TransferFailed();

        emit ETHWithdrawn(owner(), amount);
    }

    /**
     * @dev Receive function to allow direct ETH transfers for buying tokens
     * Calculates token amount based on sent ETH and buy price
     */
    receive() external payable {
        if (msg.value == 0) revert ZeroAmount();

        // Calculate how many base units can be bought with sent ETH
        // tokenAmount = (msg.value * 1e18) / buyPrice
        uint256 tokenAmount = (msg.value * 1e18) / buyPrice;
        if (tokenAmount == 0) revert InsufficientETH();

        uint256 actualCost = (tokenAmount * buyPrice) / 1e18;
        uint256 contractBalance = token.balanceOf(address(this));

        if (contractBalance >= tokenAmount) {
            // Use existing reserves
            require(token.transfer(msg.sender, tokenAmount), "Transfer failed");
        } else {
            // Transfer available reserves if any
            if (contractBalance > 0) {
                require(token.transfer(msg.sender, contractBalance), "Transfer failed");
            }

            // Mint remaining tokens
            uint256 tokensToMint = tokenAmount - contractBalance;
            token.mint(msg.sender, tokensToMint);
        }

        // Refund excess ETH
        if (msg.value > actualCost) {
            (bool success, ) = msg.sender.call{value: msg.value - actualCost}("");
            if (!success) revert TransferFailed();
        }

        emit TokensPurchased(msg.sender, tokenAmount, actualCost);
    }

    // to help with testing
    function getTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    
    function calculateBuyCost(uint256 tokenAmount) external view returns (uint256) {
        return (tokenAmount * buyPrice) / 1e18;
    }

    
    function calculateSellRefund(uint256 tokenAmount) external view returns (uint256) {
        return (tokenAmount * sellPrice) / 1e18;
    }
}
