// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {AuctionHouse} from "../auctionContract.sol";

contract DeployAuctionHouse is Script {
    address constant FEE_RECEIVER = 0x755Dc65333C16F388d2054513B9D013D7035F230;
    address constant OWNER = 0x1ce256752fBa067675F09291d12A1f069f34f5e8;
    uint256 constant FEE_PERCENT = 0;

    /// Global Dollar, 6 decimals.
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    /// Late Night Onchain, 18 decimals.
    address constant LNOC = 0x076277c3d6b57B4aad34c592cd2f138e9316a991;

    function run() external {
        address[] memory tokens = new address[](2);
        tokens[0] = USDG;
        tokens[1] = LNOC;

        vm.startBroadcast();
        AuctionHouse house = new AuctionHouse(FEE_RECEIVER, FEE_PERCENT, OWNER, tokens);
        vm.stopBroadcast();
        console.log("AuctionHouse deployed at", address(house));
    }
}
