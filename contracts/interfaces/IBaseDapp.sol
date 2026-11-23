// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBaseDapp
 * @notice Standard interface for QMOOSA production dApp core baseline.
 */
interface IBaseDapp {
    // Custom Errors
    error Unauthorized();
    error ZeroAddress();
    error InvalidParameter();
    error ReentrancyDetected();
    error TransferFailed();

    // Events
    event StateUpdated(bytes32 indexed key, bytes value, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function getVersion() external pure returns (string memory);
    function owner() external view returns (address);
    function updateState(bytes32 key, bytes calldata value) external;
}
