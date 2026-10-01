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

        address[] memory tokens = new address[](2);
        tokens[0] = address(usdg);
        tokens[1] = address(lnoc);
        house = new AuctionHouse(fees, 500, owner, tokens);

        for (uint256 i = 0; i < 2; i++) {
            address who = i == 0 ? alice : bob;
            usdg.mint(who, 1_000_000e6);
            lnoc.mint(who, 1_000_000_000e18);
            vm.startPrank(who);
            usdg.approve(address(house), type(uint256).max);
            lnoc.approve(address(house), type(uint256).max);
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

    function test_rejectsUnacceptedToken() public {
        vm.prank(seller);
        vm.expectRevert("Token not accepted");
        house.startAuction("stray", address(stray), 24, 1e18);
    }

    function test_removedTokenKeepsOpenListingsWorking() public {
        vm.prank(seller);
        house.startAuction("open", address(lnoc), 24, 1e18);
        vm.prank(owner);
        house.setAcceptedToken(address(lnoc), false);

        vm.prank(alice);
        house.placeBid("open", 2e18, "alice");

        vm.prank(seller);
        vm.expectRevert("Token not accepted");
        house.startAuction("new", address(lnoc), 24, 1e18);
        assertEq(house.getAcceptedTokens().length, 1);
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
