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
    bool isFixedPrice;
    bool settled;
    Bidders[] bidders;
    mapping(address => uint256) bids;
    mapping(address => bool) hasBid;
}

contract AuctionHouse is Ownable {
    mapping(string => Auction) private auctions;
    string[] private allAuctionIds;

    /// @notice Protocol fee in basis points (100 = 1%, 1000 = 10%). Applied on
    ///         winning auction bids and on fixed-price purchases.
    uint256 public feePercent;
    address public feeReceiver;

    event BidPlaced(string indexed auctionId, address indexed bidder, uint256 amount, string fid);
    event AuctionEnded(string indexed auctionId, address winner, uint256 amount, address auctionOwner, uint256 feeTaken);
    event AuctionStarted(string indexed auctionId, address owner, string tokenName, uint256 deadline, uint256 minBidAmount);
    event ListingStarted(string indexed listingId, address owner, string tokenName, uint256 deadline, uint256 price);
    event ListingSold(string indexed listingId, address buyer, uint256 amount, address listingOwner, uint256 feeTaken);
    event FeeSettingsUpdated(uint256 newFeePercent, address newFeeReceiver);

    constructor(address _feeReceiver, uint256 _feePercent, address _owner) Ownable(_owner) {
        require(_feeReceiver != address(0), "Invalid fee receiver");
        require(_feePercent <= 1000, "Fee too high (>10%)");
        feeReceiver = _feeReceiver;
        feePercent = _feePercent;
    }

    // ------------------ CONFIGURATION ------------------

    function updateFeeSettings(address _newReceiver, uint256 _newPercent) external onlyOwner {
        require(_newReceiver != address(0), "Invalid fee receiver");
        require(_newPercent <= 1000, "Fee too high (>10%)");
        feeReceiver = _newReceiver;
        feePercent = _newPercent;
        emit FeeSettingsUpdated(_newPercent, _newReceiver);
    }

    function setFeeReceiver(address _newReceiver) external onlyOwner {
        require(_newReceiver != address(0), "Invalid fee receiver");
        feeReceiver = _newReceiver;
        emit FeeSettingsUpdated(feePercent, _newReceiver);
    }

    // ------------------ CREATE LISTINGS ------------------

    function startAuction(
        string calldata _auctionId,
        address _token,
        string calldata _tokenName,
        uint256 durationHours,
        uint256 _minBidAmount
    ) external {
        _createListing(_auctionId, _token, _tokenName, durationHours, _minBidAmount, false);
        emit AuctionStarted(_auctionId, msg.sender, _tokenName, auctions[_auctionId].deadline, _minBidAmount);
    }

    function startFixedPriceListing(
        string calldata _listingId,
        address _token,
        string calldata _tokenName,
        uint256 durationHours,
        uint256 _price
    ) external {
        _createListing(_listingId, _token, _tokenName, durationHours, _price, true);
        emit ListingStarted(_listingId, msg.sender, _tokenName, auctions[_listingId].deadline, _price);
    }

    function _createListing(
        string calldata _id,
        address _token,
        string calldata _tokenName,
        uint256 durationHours,
        uint256 _minBidOrPrice,
        bool _isFixedPrice
    ) internal {
        require(bytes(_id).length > 0, "Listing ID required");
        require(auctions[_id].owner == address(0), "Listing already exists");
        require(_token != address(0), "Invalid token");
        require(durationHours > 0, "Duration > 0");
        require(_minBidOrPrice > 0, "Price/min bid > 0");
        require(_activeListingCount(msg.sender) < 3, "Max 3 active listings per owner");

        Auction storage a = auctions[_id];
        a.erc20 = IERC20(_token);
        a.tokenPermit = IERC20Permit(_token);
        a.tokenName = _tokenName;
        a.owner = msg.sender;
        a.deadline = block.timestamp + (durationHours * 1 hours);
        a.minBidAmount = _minBidOrPrice;
        a.isFixedPrice = _isFixedPrice;

        allAuctionIds.push(_id);
    }

    function _activeListingCount(address _owner) internal view returns (uint256 count) {
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            Auction storage a = auctions[allAuctionIds[i]];
            if (a.owner == _owner && !a.settled && a.deadline > block.timestamp) count++;
        }
    }

    // ------------------ AUCTION BIDS ------------------

    function placeBid(string memory _auctionId, uint256 amount, string memory fid) public {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(!a.isFixedPrice, "Not an auction");
        require(!a.settled, "Auction settled");
        require(block.timestamp < a.deadline, "Auction ended");
        require(amount >= a.minBidAmount, "Bid below minimum");
        require(amount > a.highestBid, "Bid too low");

        require(a.erc20.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Refund the previous highest bidder in full. Fee is charged only
        // on the winning bid when the auction is settled.
        if (a.highestBidder != address(0)) {
            uint256 refund = a.highestBid;
            address prevBidder = a.highestBidder;
            a.highestBid = 0;
            require(a.erc20.transfer(prevBidder, refund), "Refund failed");
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

    // ------------------ SETTLE ------------------

    function endAuction(string memory _auctionId) external {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(!a.isFixedPrice, "Not an auction");
        require(!a.settled, "Already settled");
        require(msg.sender == a.owner, "Only auction owner can end");

        uint256 feeTaken;
        if (a.highestBid > 0 && a.highestBidder != address(0)) {
            feeTaken = _settle(a, a.highestBid);
            a.bids[a.highestBidder] = 0;
        } else {
            a.settled = true;
        }

        emit AuctionEnded(_auctionId, a.highestBidder, a.highestBid, a.owner, feeTaken);
    }

    function buyListing(string calldata _listingId, string calldata fid) external {
        Auction storage a = auctions[_listingId];
        require(a.owner != address(0), "Listing not found");
        require(a.isFixedPrice, "Not a fixed-price listing");
        require(!a.settled, "Already sold");
        require(block.timestamp < a.deadline, "Listing expired");
        require(msg.sender != a.owner, "Cannot buy own listing");

        uint256 price = a.minBidAmount;
        require(a.erc20.transferFrom(msg.sender, address(this), price), "Transfer failed");

        a.highestBid = price;
        a.highestBidder = msg.sender;
        a.bids[msg.sender] = price;
        a.hasBid[msg.sender] = true;
        a.bidders.push(Bidders({bidder: msg.sender, bidAmount: price, fid: fid}));

        uint256 feeTaken = _settle(a, price);
        emit ListingSold(_listingId, msg.sender, price, a.owner, feeTaken);
    }

    /// @dev Takes feePercent of `amount` to feeReceiver and the rest to the listing owner.
    function _settle(Auction storage a, uint256 amount) internal returns (uint256 feeTaken) {
        require(!a.settled, "Already settled");
        a.settled = true;

        feeTaken = (amount * feePercent) / 10000;
        uint256 payout = amount - feeTaken;

        require(a.erc20.transfer(a.owner, payout), "Payout failed");
        if (feeTaken > 0) {
            require(a.erc20.transfer(feeReceiver, feeTaken), "Fee transfer failed");
        }
    }

    // ------------------ VIEWS ------------------

    function getAuctionMeta(string memory _auctionId) external view returns (AuctionMeta memory) {
        return _toMeta(_auctionId, auctions[_auctionId]);
    }

    function getBidders(string memory _auctionId) external view returns (Bidders[] memory) {
        return auctions[_auctionId].bidders;
    }

    function getListingType(string calldata _id) external view returns (bool isFixedPrice, bool settled) {
        Auction storage a = auctions[_id];
        return (a.isFixedPrice, a.settled);
    }

    function getActiveAuctions() external view returns (AuctionMeta[] memory) {
        uint256 activeCount;
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            if (_isActive(auctions[allAuctionIds[i]])) activeCount++;
        }

        AuctionMeta[] memory result = new AuctionMeta[](activeCount);
        uint256 idx;
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            string storage id = allAuctionIds[i];
            if (_isActive(auctions[id])) {
                result[idx] = _toMeta(id, auctions[id]);
                idx++;
            }
        }
        return result;
    }

    function getActiveAuctionsByOwner(address _owner) external view returns (AuctionMeta[] memory) {
        uint256 activeCount;
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            Auction storage a = auctions[allAuctionIds[i]];
            if (a.owner == _owner && _isActive(a)) activeCount++;
        }

        AuctionMeta[] memory result = new AuctionMeta[](activeCount);
        uint256 idx;
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            string storage id = allAuctionIds[i];
            Auction storage a = auctions[id];
            if (a.owner == _owner && _isActive(a)) {
                result[idx] = _toMeta(id, a);
                idx++;
            }
        }
        return result;
    }

    function _isActive(Auction storage a) internal view returns (bool) {
        return a.owner != address(0) && !a.settled && a.deadline > block.timestamp;
    }

    function _toMeta(string memory id, Auction storage a) internal view returns (AuctionMeta memory) {
        return AuctionMeta({
            caInUse: address(a.erc20),
            tokenName: a.tokenName,
            deadline: a.deadline,
            auctionId: id,
            auctionOwner: a.owner,
            highestBid: a.highestBid,
            highestBidder: a.highestBidder,
            minBidAmount: a.minBidAmount
        });
    }
}
