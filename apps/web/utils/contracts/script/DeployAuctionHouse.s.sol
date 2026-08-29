// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {AuctionHouse} from "../auctionContract.sol";

contract DeployAuctionHouse is Script {
    address constant FEE_RECEIVER = 0x1ce256752fBa067675F09291d12A1f069f34f5e8;
    address constant OWNER = 0x1ce256752fBa067675F09291d12A1f069f34f5e8;
    uint256 constant FEE_PERCENT = 0;

    function run() external {
        vm.startBroadcast();
        AuctionHouse house = new AuctionHouse(FEE_RECEIVER, FEE_PERCENT, OWNER);
        vm.stopBroadcast();
        console.log("AuctionHouse deployed at", address(house));
    }
}
