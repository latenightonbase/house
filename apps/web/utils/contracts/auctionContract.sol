// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct Bidders {
    address bidder;
    /// Token units escrowed, in the listing's own token.
    uint256 bidAmount;
    string fid;
}

struct AuctionMeta {
    uint256 deadline;
    string auctionId;
    address auctionOwner;
    /// The ERC-20 the seller priced this listing in. Every bid and purchase is paid in it.
    address token;
    /// Asking price for a fixed-price listing, minimum bid for an auction — in `token` units.
    uint256 price;
    uint256 highestBid;
    address highestBidder;
    bool isFixedPrice;
    bool settled;
}

struct Auction {
    address owner;
    IERC20 token;
    uint256 deadline;
    uint256 price;
    address highestBidder;
    uint256 highestBid;
    bool isFixedPrice;
    bool settled;
    Bidders[] bidders;
    mapping(address => uint256) bidderIndex;
    mapping(address => bool) hasBid;
}

/**
 * @title AuctionHouse
 * @notice Each listing is priced in one ERC-20 the seller picks when creating
 *         it — USDG or LNOC — and is bought or bid on in that same token. The
 *         contract never converts between tokens, so it needs no price feed:
 *         amounts are plain token units at whatever decimals the token has.
 */
contract AuctionHouse is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(string => Auction) private auctions;
    string[] private allAuctionIds;

    /// Tokens a seller may price a new listing in.
    mapping(address => bool) public acceptedToken;
    address[] private acceptedTokens;

    /// @notice Protocol fee in basis points (100 = 1%, 1000 = 10%). Applied on
    ///         winning auction bids and on fixed-price purchases.
    uint256 public feePercent;
    address public feeReceiver;

    event BidPlaced(string indexed auctionId, address indexed bidder, address token, uint256 amount, string fid);
    event AuctionEnded(
        string indexed auctionId,
        address winner,
        address token,
        uint256 amount,
        address auctionOwner,
        uint256 feeTaken
    );
    event AuctionStarted(string indexed auctionId, address owner, address token, uint256 deadline, uint256 minBid);
    event ListingStarted(string indexed listingId, address owner, address token, uint256 deadline, uint256 price);
    event ListingSold(
        string indexed listingId,
        address buyer,
        address token,
        uint256 amount,
        address listingOwner,
        uint256 feeTaken
    );
    event FeeSettingsUpdated(uint256 newFeePercent, address newFeeReceiver);
    event TokenAccepted(address indexed token, bool accepted);

    /// @param _tokens Accepted from the start, so a fresh deployment can take listings immediately.
    constructor(address _feeReceiver, uint256 _feePercent, address _owner, address[] memory _tokens)
        Ownable(_owner)
    {
        require(_feeReceiver != address(0), "Invalid fee receiver");
        require(_feePercent <= 1000, "Fee too high (>10%)");
        feeReceiver = _feeReceiver;
        feePercent = _feePercent;
        for (uint256 i = 0; i < _tokens.length; i++) {
            _setAcceptedToken(_tokens[i], true);
        }
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

    /**
     * @notice Allows or stops new listings priced in `_token`. Listings already
     *         open in it are untouched — bids, purchases and refunds still run.
     */
    function setAcceptedToken(address _token, bool _accepted) external onlyOwner {
        _setAcceptedToken(_token, _accepted);
    }

    function _setAcceptedToken(address _token, bool _accepted) internal {
        require(_token != address(0), "Invalid token");
        if (acceptedToken[_token] == _accepted) return;
        acceptedToken[_token] = _accepted;

        if (_accepted) {
            acceptedTokens.push(_token);
        } else {
            for (uint256 i = 0; i < acceptedTokens.length; i++) {
                if (acceptedTokens[i] == _token) {
                    acceptedTokens[i] = acceptedTokens[acceptedTokens.length - 1];
                    acceptedTokens.pop();
                    break;
                }
            }
        }
        emit TokenAccepted(_token, _accepted);
    }

    function getAcceptedTokens() external view returns (address[] memory) {
        return acceptedTokens;
    }

    // ------------------ CREATE LISTINGS ------------------

    function startAuction(string calldata _auctionId, address _token, uint256 durationHours, uint256 _minBid)
        external
    {
        _createListing(_auctionId, _token, durationHours, _minBid, false);
        emit AuctionStarted(_auctionId, msg.sender, _token, auctions[_auctionId].deadline, _minBid);
    }

    function startFixedPriceListing(
        string calldata _listingId,
        address _token,
        uint256 durationHours,
        uint256 _price
    ) external {
        _createListing(_listingId, _token, durationHours, _price, true);
        emit ListingStarted(_listingId, msg.sender, _token, auctions[_listingId].deadline, _price);
    }

    function _createListing(
        string calldata _id,
        address _token,
        uint256 durationHours,
        uint256 _price,
        bool _isFixedPrice
    ) internal {
        require(bytes(_id).length > 0, "Listing ID required");
        require(auctions[_id].owner == address(0), "Listing already exists");
        require(acceptedToken[_token], "Token not accepted");
        require(durationHours > 0, "Duration > 0");
        require(_price > 0, "Price/min bid > 0");
        require(_activeListingCount(msg.sender) < 3, "Max 3 active listings per owner");

        Auction storage a = auctions[_id];
        a.owner = msg.sender;
        a.token = IERC20(_token);
        a.deadline = block.timestamp + (durationHours * 1 hours);
        a.price = _price;
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

    /**
     * @notice Bids `amount` of the auction's token. The previous leader is
     *         refunded in full.
     */
    function placeBid(string memory _auctionId, uint256 amount, string memory fid) public nonReentrant {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(!a.isFixedPrice, "Not an auction");
        require(!a.settled, "Auction settled");
        require(block.timestamp < a.deadline, "Auction ended");
        require(msg.sender != a.owner, "Cannot bid on own auction");
        require(amount >= a.price, "Bid below minimum");
        require(amount > a.highestBid, "Bid too low");

        a.token.safeTransferFrom(msg.sender, address(this), amount);

        address prevBidder = a.highestBidder;
        uint256 prevAmount = a.highestBid;

        a.highestBidder = msg.sender;
        a.highestBid = amount;

        if (a.hasBid[msg.sender]) {
            Bidders storage entry = a.bidders[a.bidderIndex[msg.sender]];
            entry.bidAmount = amount;
            entry.fid = fid;
        } else {
            a.bidderIndex[msg.sender] = a.bidders.length;
            a.hasBid[msg.sender] = true;
            a.bidders.push(Bidders({ bidder: msg.sender, bidAmount: amount, fid: fid }));
        }

        // Fee is charged only on the winning bid at settlement, so an outbid
        // leader is made whole.
        if (prevBidder != address(0) && prevAmount > 0) {
            a.token.safeTransfer(prevBidder, prevAmount);
        }

        emit BidPlaced(_auctionId, msg.sender, address(a.token), amount, fid);
    }

    // ------------------ SETTLE ------------------

    /**
     * @notice Settles an auction: the leader's escrow goes to the owner (less
     *         the fee), or it simply closes if nobody bid. The owner may end it
     *         early; once the deadline passes anyone can, so the house's keeper
     *         can settle a seller's auction without the seller coming back.
     */
    function endAuction(string memory _auctionId) external nonReentrant {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(!a.isFixedPrice, "Not an auction");
        require(!a.settled, "Already settled");
        require(
            msg.sender == a.owner || block.timestamp >= a.deadline,
            "Only owner can end before deadline"
        );

        uint256 feeTaken;
        if (a.highestBid > 0 && a.highestBidder != address(0)) {
            feeTaken = _settle(a, a.highestBid);
        } else {
            a.settled = true;
        }

        emit AuctionEnded(_auctionId, a.highestBidder, address(a.token), a.highestBid, a.owner, feeTaken);
    }

    /// @notice Buys a fixed-price listing, paying its price in the listing's token.
    function buyListing(string calldata _listingId, string calldata fid) external nonReentrant {
        Auction storage a = auctions[_listingId];
        require(a.owner != address(0), "Listing not found");
        require(a.isFixedPrice, "Not a fixed-price listing");
        require(!a.settled, "Already sold");
        require(block.timestamp < a.deadline, "Listing expired");
        require(msg.sender != a.owner, "Cannot buy own listing");

        uint256 amount = a.price;
        a.token.safeTransferFrom(msg.sender, address(this), amount);

        a.highestBidder = msg.sender;
        a.highestBid = amount;

        if (!a.hasBid[msg.sender]) {
            a.bidderIndex[msg.sender] = a.bidders.length;
            a.hasBid[msg.sender] = true;
            a.bidders.push(Bidders({ bidder: msg.sender, bidAmount: amount, fid: fid }));
        }

        uint256 feeTaken = _settle(a, amount);
        emit ListingSold(_listingId, msg.sender, address(a.token), amount, a.owner, feeTaken);
    }

    /// @dev Takes feePercent of `amount` to feeReceiver and the rest to the listing owner.
    function _settle(Auction storage a, uint256 amount) internal returns (uint256 feeTaken) {
        require(!a.settled, "Already settled");
        a.settled = true;

        feeTaken = (amount * feePercent) / 10000;
        uint256 payout = amount - feeTaken;

        a.token.safeTransfer(a.owner, payout);
        if (feeTaken > 0) {
            a.token.safeTransfer(feeReceiver, feeTaken);
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
            deadline: a.deadline,
            auctionId: id,
            auctionOwner: a.owner,
            token: address(a.token),
            price: a.price,
            highestBid: a.highestBid,
            highestBidder: a.highestBidder,
            isFixedPrice: a.isFixedPrice,
            settled: a.settled
        });
    }
}
