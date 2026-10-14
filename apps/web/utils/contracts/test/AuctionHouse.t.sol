// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AuctionHouse, AuctionMeta} from "../auctionContract.sol";

contract MockToken is ERC20 {
    uint8 private immutable _decimals;

    constructor(string memory symbol, uint8 decimals_) ERC20(symbol, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// Keeps 1% of every transfer, so the recipient gets less than was sent.
contract FeeToken is MockToken {
    constructor() MockToken("FEE", 18) {}

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 cut = value / 100;
            super._update(from, address(0), cut);
            value -= cut;
        }
        super._update(from, to, value);
    }
}

contract AuctionHouseTest is Test {
    AuctionHouse house;
    MockToken usdg;
    MockToken lnoc;
    MockToken stray;

    address owner = address(0xA11CE);
    address fees = address(0xFEE);
    address seller = address(0x5E11);
    address alice = address(0xA);
    address bob = address(0xB);

    function setUp() public {
        usdg = new MockToken("USDG", 6);
        lnoc = new MockToken("LNOC", 18);
        stray = new MockToken("STRAY", 18);

        house = new AuctionHouse(fees, 500, owner);

        for (uint256 i = 0; i < 2; i++) {
            address who = i == 0 ? alice : bob;
            usdg.mint(who, 1_000_000e6);
            lnoc.mint(who, 1_000_000_000e18);
            stray.mint(who, 1_000e18);
            vm.startPrank(who);
            usdg.approve(address(house), type(uint256).max);
            lnoc.approve(address(house), type(uint256).max);
            stray.approve(address(house), type(uint256).max);
            vm.stopPrank();
        }
    }

    function test_fixedPriceInUsdg() public {
        vm.prank(seller);
        house.startFixedPriceListing("fixed", address(usdg), 24, 1500e6);

        vm.prank(alice);
        house.buyListing("fixed", "alice");

        // 5% fee in the listing's own token, the rest to the seller.
        assertEq(usdg.balanceOf(seller), 1425e6);
        assertEq(usdg.balanceOf(fees), 75e6);
        AuctionMeta memory meta = house.getAuctionMeta("fixed");
        assertTrue(meta.settled);
        assertEq(meta.highestBidder, alice);
        assertEq(meta.token, address(usdg));
    }

    function test_auctionInLnocRefundsOutbidLeader() public {
        vm.prank(seller);
        house.startAuction("auction", address(lnoc), 24, 1_000_000e18);

        vm.prank(alice);
        house.placeBid("auction", 1_000_000e18, "alice");
        uint256 aliceBefore = lnoc.balanceOf(alice);

        vm.prank(bob);
        house.placeBid("auction", 2_000_000e18, "bob");
        assertEq(lnoc.balanceOf(alice), aliceBefore + 1_000_000e18);

        vm.prank(seller);
        house.endAuction("auction");
        assertEq(lnoc.balanceOf(seller), 1_900_000e18);
        assertEq(lnoc.balanceOf(fees), 100_000e18);
        assertEq(house.getBidders("auction").length, 2);
    }

    function test_anyTokenTheSellerPicks() public {
        vm.prank(seller);
        house.startAuction("stray", address(stray), 24, 1e18);

        vm.prank(alice);
        house.placeBid("stray", 1e18, "alice");
        vm.prank(bob);
        house.placeBid("stray", 3e18, "bob");

        vm.prank(seller);
        house.endAuction("stray");
        assertEq(stray.balanceOf(seller), 2.85e18);
        assertEq(stray.balanceOf(alice), 1_000e18);
        assertEq(house.getAuctionMeta("stray").token, address(stray));
    }

    function test_rejectsNonContractToken() public {
        vm.prank(seller);
        vm.expectRevert("Token is not a contract");
        house.startAuction("eoa", address(0xBEEF), 24, 1e18);
    }

    function test_rejectsFeeOnTransferEscrow() public {
        FeeToken fee = new FeeToken();
        fee.mint(alice, 100e18);
        vm.prank(alice);
        fee.approve(address(house), type(uint256).max);

        vm.prank(seller);
        house.startFixedPriceListing("fee", address(fee), 24, 10e18);

        vm.prank(alice);
        vm.expectRevert("Fee-on-transfer tokens not supported");
        house.buyListing("fee", "alice");
    }

    function test_blockedTokenKeepsOpenListingsWorking() public {
        vm.prank(seller);
        house.startAuction("open", address(lnoc), 24, 1e18);

        vm.prank(alice);
        vm.expectRevert();
        house.setTokenBlocked(address(lnoc), true);

        vm.prank(owner);
        house.setTokenBlocked(address(lnoc), true);

        vm.prank(alice);
        house.placeBid("open", 2e18, "alice");

        vm.prank(seller);
        vm.expectRevert("Token blocked");
        house.startAuction("new", address(lnoc), 24, 1e18);

        vm.prank(owner);
        house.setTokenBlocked(address(lnoc), false);
        vm.prank(seller);
        house.startAuction("new", address(lnoc), 24, 1e18);
    }

    function test_bidRules() public {
        vm.prank(seller);
        house.startAuction("rules", address(usdg), 1, 10e6);

        vm.prank(alice);
        vm.expectRevert("Bid below minimum");
        house.placeBid("rules", 9e6, "alice");

        vm.prank(alice);
        house.placeBid("rules", 10e6, "alice");

        vm.prank(bob);
        vm.expectRevert("Bid too low");
        house.placeBid("rules", 10e6, "bob");

        vm.prank(seller);
        vm.expectRevert("Cannot bid on own auction");
        house.placeBid("rules", 20e6, "seller");

        vm.warp(block.timestamp + 1 hours);
        vm.prank(bob);
        vm.expectRevert("Auction ended");
        house.placeBid("rules", 20e6, "bob");
    }

    function test_anyoneSettlesAfterDeadline() public {
        vm.prank(seller);
        house.startAuction("late", address(usdg), 1, 10e6);
        vm.prank(alice);
        house.placeBid("late", 10e6, "alice");

        vm.prank(bob);
        vm.expectRevert("Only owner can end before deadline");
        house.endAuction("late");

        vm.warp(block.timestamp + 1 hours);
        vm.prank(bob);
        house.endAuction("late");
        assertEq(usdg.balanceOf(seller), 9.5e6);
    }
}
