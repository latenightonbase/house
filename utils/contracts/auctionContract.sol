// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct Bidders {
    address bidder;
    uint256 bidAmount;
    string fid;
}

struct AuctionMeta {
    address caInUse;
    string tokenName;
    uint256 deadline;
    string auctionId;
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

contract AuctionHouse is Ownable {
    // auctionId (UUID string) → Auction
    mapping(string => Auction) private auctions;
    string[] private allAuctionIds;

    // platform fee details
    uint256 public feePercent; // e.g. 200 = 2%
    address public feeReceiver;

    event BidPlaced(string indexed auctionId, address indexed bidder, uint256 amount, string fid);
    event AuctionEnded(string indexed auctionId, address winner, uint256 amount, address auctionOwner, uint256 feeTaken);
    event AuctionStarted(string indexed auctionId, address owner, string tokenName, uint256 deadline, uint256 minBidAmount);
    event FeeSettingsUpdated(uint256 newFeePercent, address newFeeReceiver);

    constructor(address _initialFeeReceiver, uint256 _initialFeePercent, address owner) Ownable(owner) {
        require(_initialFeeReceiver != address(0), "Invalid fee receiver");
        require(_initialFeePercent <= 1000, "Fee too high (>10%)");

        feeReceiver = _initialFeeReceiver;
        feePercent = _initialFeePercent;
    }

    /// @notice Admin: Update fee settings
    function updateFeeSettings(address _newReceiver, uint256 _newPercent) external onlyOwner {
        require(_newReceiver != address(0), "Invalid receiver");
        require(_newPercent <= 1000, "Fee too high (>10%)");

        feeReceiver = _newReceiver;
        feePercent = _newPercent;

        emit FeeSettingsUpdated(_newPercent, _newReceiver);
    }

    /// @notice Start a new auction (auctionId passed from JS)
    function startAuction(
        string calldata _auctionId,
        address _token,
        string calldata _tokenName,
        uint256 durationHours,
        uint256 _minBidAmount
    ) external {
        require(bytes(_auctionId).length > 0, "Auction ID required");
        require(auctions[_auctionId].owner == address(0), "Auction already exists");
        require(_activeAuctionCount(msg.sender) < 3, "Max 3 active auctions allowed per owner");
        require(_minBidAmount > 0, "Minimum bid must be greater than 0");

        Auction storage a = auctions[_auctionId];
        a.erc20 = IERC20(_token);
        a.tokenPermit = IERC20Permit(_token);
        a.tokenName = _tokenName;
        a.owner = msg.sender;
        a.deadline = block.timestamp + (durationHours * 1 hours);
        a.minBidAmount = _minBidAmount;

        allAuctionIds.push(_auctionId);

        emit AuctionStarted(_auctionId, msg.sender, _tokenName, a.deadline, _minBidAmount);
    }

    /// @notice Get metadata for an auction
    function getAuctionMeta(string memory _auctionId) public view returns (AuctionMeta memory) {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
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
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            Auction storage a = auctions[allAuctionIds[i]];
            if (a.deadline > block.timestamp) {
                activeCount++;
            }
        }

        AuctionMeta[] memory activeAuctions = new AuctionMeta[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            string memory id = allAuctionIds[i];
            Auction storage a = auctions[id];
            if (a.deadline > block.timestamp) {
                activeAuctions[index] = getAuctionMeta(id);
                index++;
            }
        }

        return activeAuctions;
    }

    /// @notice Get all active auctions by owner
    function getActiveAuctionsByOwner(address _owner) external view returns (AuctionMeta[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            Auction storage a = auctions[allAuctionIds[i]];
            if (a.deadline > block.timestamp && a.owner == _owner) {
                activeCount++;
            }
        }

        AuctionMeta[] memory ownerActiveAuctions = new AuctionMeta[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            string memory id = allAuctionIds[i];
            Auction storage a = auctions[id];
            if (a.deadline > block.timestamp && a.owner == _owner) {
                ownerActiveAuctions[index] = getAuctionMeta(id);
                index++;
            }
        }

        return ownerActiveAuctions;
    }

    /// @notice Internal helper: count active auctions by owner
    function _activeAuctionCount(address _owner) internal view returns (uint256 count) {
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            Auction storage a = auctions[allAuctionIds[i]];
            if (a.deadline > block.timestamp && a.owner == _owner) {
                count++;
            }
        }
    }

    /// @notice Place a bid
    function placeBid(string memory _auctionId, uint256 amount, string memory fid) public {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
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

    /// @notice End auction and distribute funds (fee deducted)
    function endAuction(string memory _auctionId) external {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(msg.sender == a.owner, "Only auction owner can end");

        uint256 feeTaken = 0;
        uint256 payout = 0;

        if (a.highestBid > 0 && a.highestBidder != address(0)) {
            // calculate platform fee
            feeTaken = (a.highestBid * feePercent) / 10000; // feePercent in basis points (e.g., 200 = 2%)
            payout = a.highestBid - feeTaken;

            if (feeTaken > 0) {
                require(a.erc20.transfer(feeReceiver, feeTaken), "Fee transfer failed");
            }

            require(a.erc20.transfer(a.owner, payout), "Payout failed");
            a.bids[a.highestBidder] = 0;
        }

        emit AuctionEnded(_auctionId, a.highestBidder, a.highestBid, a.owner, feeTaken);

        a.highestBidder = address(0);
        a.highestBid = 0;
    }

    /// @notice Get all bidders for an auction
    function getBidders(string memory _auctionId) external view returns (Bidders[] memory) {
        return auctions[_auctionId].bidders;
    }
}
