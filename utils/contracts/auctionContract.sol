// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

struct Bidders {
    address bidder;
    uint256 bidAmount;
    string fid;
}

struct AuctionMeta {
    address caInUse;
    string tokenName;
    uint256 deadline;
    uint256 auctionId;
    address auctionOwner;
    uint256 highestBid;
    address highestBidder;
    uint256 minBidAmount;
}

struct Auction {
    IERC20 erc20;
    IERC20Permit tokenPermit;
    string tokenName;
    address owner;
    uint256 deadline;
    address highestBidder;
    uint256 highestBid;
    uint256 minBidAmount;
    Bidders[] bidders;
    mapping(address => uint256) bids;
    mapping(address => bool) hasBid;
}

contract AuctionHouse {
    uint256 public auctionCounter;
    mapping(uint256 => Auction) private auctions;

    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, string fid);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount, address auctionOwner);

    /// @notice Start a new auction
    function startAuction(
        address _token,
        string calldata _tokenName,
        uint256 durationHours,
        uint256 _minBidAmount
    ) external returns (uint256) {
        require(_activeAuctionCount(msg.sender) < 3, "Max 3 active auctions allowed per owner");
        require(_minBidAmount > 0, "Minimum bid must be greater than 0");

        auctionCounter++;
        uint256 newAuctionId = auctionCounter;

        Auction storage a = auctions[newAuctionId];
        a.erc20 = IERC20(_token);
        a.tokenPermit = IERC20Permit(_token);
        a.tokenName = _tokenName;
        a.owner = msg.sender;
        a.deadline = block.timestamp + (durationHours * 1 hours);
        a.minBidAmount = _minBidAmount;

        return newAuctionId;
    }

    /// @notice Get metadata for an auction
    function getAuctionMeta(uint256 _auctionId) public view returns (AuctionMeta memory) {
        Auction storage a = auctions[_auctionId];
        return AuctionMeta({
            caInUse: address(a.erc20),
            tokenName: a.tokenName,
            deadline: a.deadline,
            auctionId: _auctionId,
            auctionOwner: a.owner,
            highestBid: a.highestBid,
            highestBidder: a.highestBidder,
            minBidAmount: a.minBidAmount
        });
    }

    /// @notice Get all active auctions
    function getActiveAuctions() external view returns (AuctionMeta[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= auctionCounter; i++) {
            if (auctions[i].deadline > block.timestamp) {
                activeCount++;
            }
        }

        AuctionMeta[] memory activeAuctions = new AuctionMeta[](activeCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= auctionCounter; i++) {
            if (auctions[i].deadline > block.timestamp) {
                activeAuctions[index] = getAuctionMeta(i);
                index++;
            }
        }

        return activeAuctions;
    }

    function _activeAuctionCount(address _owner) internal view returns (uint256 count) {
        for (uint256 i = 1; i <= auctionCounter; i++) {
            Auction storage a = auctions[i];
            if (a.deadline > block.timestamp && a.owner == _owner) {
                count++;
            }
        }
    }

    /// @notice Get all active auctions created by a specific owner
    function getActiveAuctionsByOwner(address _owner) external view returns (AuctionMeta[] memory) {
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= auctionCounter; i++) {
            Auction storage a = auctions[i];
            if (a.deadline > block.timestamp && a.owner == _owner) {
                activeCount++;
            }
        }

        AuctionMeta[] memory ownerActiveAuctions = new AuctionMeta[](activeCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= auctionCounter; i++) {
            Auction storage a = auctions[i];
            if (a.deadline > block.timestamp && a.owner == _owner) {
                ownerActiveAuctions[index] = getAuctionMeta(i);
                index++;
            }
        }

        return ownerActiveAuctions;
    }

    /// @notice Place a bid
    function placeBid(uint256 _auctionId, uint256 amount, string memory fid) public {
        Auction storage a = auctions[_auctionId];
        require(block.timestamp < a.deadline, "Auction ended");
        require(amount >= a.minBidAmount, "Bid below minimum amount");
        require(amount > a.highestBid, "Bid too low");

        require(a.erc20.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        if (a.highestBidder != address(0)) {
            uint256 refundAmount = a.highestBid;
            address previousBidder = a.highestBidder;
            a.highestBid = 0;
            require(a.erc20.transfer(previousBidder, refundAmount), "Refund failed");
        }

        a.bids[msg.sender] = amount;

        if (!a.hasBid[msg.sender]) {
            a.bidders.push(Bidders({bidder: msg.sender, bidAmount: amount, fid: fid}));
            a.hasBid[msg.sender] = true;
        } else {
            for (uint256 i = 0; i < a.bidders.length; i++) {
                if (a.bidders[i].bidder == msg.sender) {
                    a.bidders[i].bidAmount = amount;
                    a.bidders[i].fid = fid;
                    break;
                }
            }
        }

        a.highestBid = amount;
        a.highestBidder = msg.sender;

        emit BidPlaced(_auctionId, msg.sender, amount, fid);
    }

    /// @notice Bid with permit
    function bidWithPermit(
        uint256 _auctionId,
        uint256 amount,
        string memory fid,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        Auction storage a = auctions[_auctionId];
        require(block.timestamp < a.deadline, "Auction ended");
        require(amount >= a.minBidAmount, "Bid below minimum amount");
        require(amount > a.highestBid, "Bid too low");

        a.tokenPermit.permit(msg.sender, address(this), amount, deadline, v, r, s);
        placeBid(_auctionId, amount, fid);
    }

    /// @notice End auction
    function endAuction(uint256 _auctionId) external {
        Auction storage a = auctions[_auctionId];
        require(msg.sender == a.owner, "Only auction owner can end");

        if (a.highestBid > 0 && a.highestBidder != address(0)) {
            require(a.erc20.transfer(a.owner, a.highestBid), "Payout failed");
            a.bids[a.highestBidder] = 0;
        }

        emit AuctionEnded(_auctionId, a.highestBidder, a.highestBid, a.owner);

        a.highestBidder = address(0);
        a.highestBid = 0;
    }

    /// @notice Get all bidders for an auction
    function getBidders(uint256 _auctionId) external view returns (Bidders[] memory) {
        return auctions[_auctionId].bidders;
    }
}
