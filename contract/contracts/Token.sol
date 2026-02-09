// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;


import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol"; 


// Part A: ERC20 token with supply cap and minter role using AccessControlDefaultAdminRules
contract Token is ERC20, AccessControlDefaultAdminRules {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public immutable MAX_SUPPLY;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 maxSupply_,
        address admin
    ) ERC20(_name, _symbol) AccessControlDefaultAdminRules(0, admin) {
        MAX_SUPPLY = maxSupply_;
        // grant the admin the minter role initially
        _grantRole(MINTER_ROLE, admin);
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    // update override 
    function _update(address from, address to, uint256 value) internal virtual override {
        if (from == address(0)) {
            // ensure cap is not exceeded
            require(totalSupply() + value <= MAX_SUPPLY, "ERC20Capped: cap exceeded");
        }
        super._update(from, to, value);
    }

    // Minting restricted to accounts with MINTER_ROLE
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
