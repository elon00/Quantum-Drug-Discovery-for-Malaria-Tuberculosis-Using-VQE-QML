// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/core/BaseDappContract.sol";

// Minimal Foundry Test interface for zero-dependency standalone execution
abstract contract Test {
    function assertEq(address a, address b) internal pure {
        require(a == b, "assertEq(address) failed");
    }
    function assertEq(string memory a, string memory b) internal pure {
        require(keccak256(bytes(a)) == keccak256(bytes(b)), "assertEq(string) failed");
    }
    function assertEq(bytes32 a, bytes32 b) internal pure {
        require(a == b, "assertEq(bytes32) failed");
    }
}

contract BaseDappContractTest is Test {
    BaseDappContract public dapp;
    address public constant OWNER = address(0x1111111111111111111111111111111111111111);
    address public constant USER = address(0x2222222222222222222222222222222222222222);

    function setUp() public {
        dapp = new BaseDappContract(OWNER);
    }

    function test_InitialVersionAndOwner() public view {
        assertEq(dapp.getVersion(), "1.0.0-QMOOSA-BASELINE");
        assertEq(dapp.owner(), OWNER);
    }

    function test_ZeroAddressRevertOnDeploy() public {
        try new BaseDappContract(address(0)) {
            revert("Expected ZeroAddress() revert");
        } catch (bytes memory lowLevelData) {
            bytes4 selector = bytes4(lowLevelData);
            assertEq(selector, BaseDappContract.ZeroAddress.selector);
        }
    }
}
