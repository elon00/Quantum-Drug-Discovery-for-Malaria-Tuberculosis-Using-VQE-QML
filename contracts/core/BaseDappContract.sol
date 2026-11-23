// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IBaseDapp.sol";

/**
 * @title BaseDappContract
 * @notice Production-grade baseline smart contract with custom errors,
 *         lightweight zero-dependency reentrancy guard, and two-step ownership.
 */
contract BaseDappContract is IBaseDapp {
    string public constant VERSION = "1.0.0-QMOOSA-BASELINE";

    address private _owner;
    address private _pendingOwner;
    uint256 private _locked = 1;

    mapping(bytes32 => bytes) private _stateRegistry;

    modifier onlyOwner() {
        if (msg.sender != _owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_locked != 1) revert ReentrancyDetected();
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function getVersion() external pure override returns (string memory) {
        return VERSION;
    }

    function owner() external view override returns (address) {
        return _owner;
    }

    function pendingOwner() external view returns (address) {
        return _pendingOwner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        _pendingOwner = newOwner;
    }

    function acceptOwnership() external {
        if (msg.sender != _pendingOwner) revert Unauthorized();
        address oldOwner = _owner;
        _owner = _pendingOwner;
        _pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, _owner);
    }

    function updateState(bytes32 key, bytes calldata value) external override onlyOwner nonReentrant {
        if (key == bytes32(0)) revert InvalidParameter();
        _stateRegistry[key] = value;
        emit StateUpdated(key, value, block.timestamp);
    }

    function getState(bytes32 key) external view returns (bytes memory) {
        return _stateRegistry[key];
    }
}
