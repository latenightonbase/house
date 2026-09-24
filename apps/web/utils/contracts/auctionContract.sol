// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct Bidders {
    address bidder;
    /// Token units actually escrowed — what a refund returns.
    uint256 bidAmount;
    address token;
    /// What that escrow was worth in USD when the bid landed. Bids are ranked on this.
    uint256 bidUsdE8;
    string fid;
}

struct AuctionMeta {
    uint256 deadline;
    string auctionId;
    address auctionOwner;
    /// Asking price for a fixed-price listing, reserve for an auction.
    uint256 priceUsdE8;
    uint256 highestBidUsdE8;
    address highestBidder;
    address highestBidToken;
    uint256 highestBidAmount;
    bool isFixedPrice;
    bool settled;
}

/// A token buyers may pay with, and what the house values it at.
struct TokenConfig {
    bool accepted;
    uint8 decimals;
    /// USD per whole token, 8 decimals (1e8 == $1.00).
    uint256 usdPriceE8;
    uint64 updatedAt;
    /// Seconds a price stays usable. 0 means never stale — for pegged stables.
    uint64 maxAge;
}

struct Auction {
    address owner;
    uint256 deadline;
    uint256 priceUsdE8;
    address highestBidder;
    IERC20 highestBidToken;
    uint256 highestBidAmount;
    uint256 highestBidUsdE8;
    bool isFixedPrice;
    bool settled;
    Bidders[] bidders;
    mapping(address => uint256) bidderIndex;
    mapping(address => bool) hasBid;
}

/**
 * @title AuctionHouse
 * @notice Listings are denominated in USD. Buyers and bidders settle in any
 *         accepted ERC-20, converted at the owner-published USD rate for that
 *         token, so a $1,500 listing costs $1,500 whether it is paid in a
 *         dollar stable or in LNOC. Auction bids are ranked by the USD value
 *         they carried when they landed, and escrow is refunded in the same
 *         token it arrived in.
 */
contract AuctionHouse is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(string => Auction) private auctions;
    string[] private allAuctionIds;

    mapping(address => TokenConfig) public tokenConfig;
    address[] private acceptedTokens;

    /// @notice Protocol fee in basis points (100 = 1%, 1000 = 10%). Applied on
    ///         winning auction bids and on fixed-price purchases.
    uint256 public feePercent;
    address public feeReceiver;

    event BidPlaced(
        string indexed auctionId,
        address indexed bidder,
        address token,
        uint256 amount,
        uint256 usdE8,
        string fid
    );
    event AuctionEnded(
        string indexed auctionId,
        address winner,
        address token,
        uint256 amount,
        uint256 usdE8,
        address auctionOwner,
        uint256 feeTaken
    );
    event AuctionStarted(string indexed auctionId, address owner, uint256 deadline, uint256 priceUsdE8);
    event ListingStarted(string indexed listingId, address owner, uint256 deadline, uint256 priceUsdE8);
    event ListingSold(
        string indexed listingId,
        address buyer,
        address token,
        uint256 amount,
        uint256 usdE8,
        address listingOwner,
        uint256 feeTaken
    );
    event FeeSettingsUpdated(uint256 newFeePercent, address newFeeReceiver);
    event TokenAccepted(address indexed token, uint8 decimals, uint64 maxAge);
    event TokenRemoved(address indexed token);
    event TokenPriceUpdated(address indexed token, uint256 usdPriceE8, uint64 updatedAt);

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

    /**
     * @notice Accepts `_token` as payment and publishes its opening USD rate.
     * @param _maxAge Seconds the rate stays usable. Pass 0 for a token pegged
     *        to the dollar, so payments never block on a rate refresh; pass a
     *        real window (an hour, a day) for anything that floats, so a rate
     *        nobody has updated stops trades instead of mispricing them.
     */
    function setToken(address _token, uint256 _usdPriceE8, uint64 _maxAge) external onlyOwner {
        require(_token != address(0), "Invalid token");
        require(_usdPriceE8 > 0, "Price > 0");

        TokenConfig storage c = tokenConfig[_token];
        if (!c.accepted) {
            c.accepted = true;
            c.decimals = IERC20Metadata(_token).decimals();
            acceptedTokens.push(_token);
        }
        c.maxAge = _maxAge;
        c.usdPriceE8 = _usdPriceE8;
        c.updatedAt = uint64(block.timestamp);

        emit TokenAccepted(_token, c.decimals, _maxAge);
        emit TokenPriceUpdated(_token, _usdPriceE8, c.updatedAt);
    }

    /// @notice Publishes a fresh USD rate. This is the call a price keeper makes.
    function setTokenUsdPrice(address _token, uint256 _usdPriceE8) external onlyOwner {
        TokenConfig storage c = tokenConfig[_token];
        require(c.accepted, "Token not accepted");
        require(_usdPriceE8 > 0, "Price > 0");
        c.usdPriceE8 = _usdPriceE8;
        c.updatedAt = uint64(block.timestamp);
        emit TokenPriceUpdated(_token, _usdPriceE8, c.updatedAt);
    }

    /**
     * @notice Stops new payments in `_token`. Escrow already held in it is
     *         untouched — refunds and settlement still pay out in it.
     */
    function removeToken(address _token) external onlyOwner {
        TokenConfig storage c = tokenConfig[_token];
        require(c.accepted, "Token not accepted");
        c.accepted = false;

        for (uint256 i = 0; i < acceptedTokens.length; i++) {
            if (acceptedTokens[i] == _token) {
                acceptedTokens[i] = acceptedTokens[acceptedTokens.length - 1];
                acceptedTokens.pop();
                break;
            }
        }
        emit TokenRemoved(_token);
    }

    function getAcceptedTokens() external view returns (address[] memory) {
        return acceptedTokens;
    }

    // ------------------ PRICING ------------------

    function _requireUsable(TokenConfig storage c) internal view {
        require(c.accepted, "Token not accepted");
        require(c.usdPriceE8 > 0, "No price for token");
        require(
            c.maxAge == 0 || block.timestamp - c.updatedAt <= c.maxAge,
            "Token price stale"
        );
    }

    /// @dev Rounds up, so a payer always covers the full dollar amount.
    function _usdToToken(TokenConfig storage c, uint256 _usdE8) internal view returns (uint256) {
        uint256 numerator = _usdE8 * (10 ** uint256(c.decimals));
        return (numerator + c.usdPriceE8 - 1) / c.usdPriceE8;
    }

    /// @dev Rounds down, so a bid is never credited with more USD than it carries.
    function _tokenToUsd(TokenConfig storage c, uint256 _amount) internal view returns (uint256) {
        return (_amount * c.usdPriceE8) / (10 ** uint256(c.decimals));
    }

    /// @notice Token units needed to cover `_usdE8` right now.
    function quoteUsd(address _token, uint256 _usdE8) external view returns (uint256) {
        TokenConfig storage c = tokenConfig[_token];
        _requireUsable(c);
        return _usdToToken(c, _usdE8);
    }

    /// @notice What `_amount` of `_token` is worth in USD right now.
    function quoteToken(address _token, uint256 _amount) external view returns (uint256) {
        TokenConfig storage c = tokenConfig[_token];
        _requireUsable(c);
        return _tokenToUsd(c, _amount);
    }

    /**
     * @notice What a buyer must send to take a fixed-price listing, or the
     *         smallest bid that beats the leader on an auction.
     */
    function quoteListing(string calldata _id, address _token)
        external
        view
        returns (uint256 tokenAmount, uint256 usdE8)
    {
        Auction storage a = auctions[_id];
        require(a.owner != address(0), "Listing not found");
        TokenConfig storage c = tokenConfig[_token];
        _requireUsable(c);

        usdE8 = a.isFixedPrice
            ? a.priceUsdE8
            : (a.highestBidUsdE8 >= a.priceUsdE8 ? a.highestBidUsdE8 + 1 : a.priceUsdE8);
        tokenAmount = _usdToToken(c, usdE8);
    }

    // ------------------ CREATE LISTINGS ------------------

    function startAuction(string calldata _auctionId, uint256 durationHours, uint256 _minBidUsdE8)
        external
    {
        _createListing(_auctionId, durationHours, _minBidUsdE8, false);
        emit AuctionStarted(_auctionId, msg.sender, auctions[_auctionId].deadline, _minBidUsdE8);
    }

    function startFixedPriceListing(
        string calldata _listingId,
        uint256 durationHours,
        uint256 _priceUsdE8
    ) external {
        _createListing(_listingId, durationHours, _priceUsdE8, true);
        emit ListingStarted(_listingId, msg.sender, auctions[_listingId].deadline, _priceUsdE8);
    }

    function _createListing(
        string calldata _id,
        uint256 durationHours,
        uint256 _priceUsdE8,
        bool _isFixedPrice
    ) internal {
        require(bytes(_id).length > 0, "Listing ID required");
        require(auctions[_id].owner == address(0), "Listing already exists");
        require(durationHours > 0, "Duration > 0");
        require(_priceUsdE8 > 0, "Price/min bid > 0");
        require(_activeListingCount(msg.sender) < 3, "Max 3 active listings per owner");

        Auction storage a = auctions[_id];
        a.owner = msg.sender;
        a.deadline = block.timestamp + (durationHours * 1 hours);
        a.priceUsdE8 = _priceUsdE8;
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
     * @notice Bids `amount` of `_token`, ranked by what that is worth in USD.
     *         The previous leader is refunded in full, in the token they paid.
     */
    function placeBid(string memory _auctionId, address _token, uint256 amount, string memory fid)
        public
        nonReentrant
    {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(!a.isFixedPrice, "Not an auction");
        require(!a.settled, "Auction settled");
        require(block.timestamp < a.deadline, "Auction ended");
        require(amount > 0, "Bid > 0");

        TokenConfig storage c = tokenConfig[_token];
        _requireUsable(c);

        uint256 usdE8 = _tokenToUsd(c, amount);
        require(usdE8 >= a.priceUsdE8, "Bid below minimum");
        require(usdE8 > a.highestBidUsdE8, "Bid too low");

        IERC20(_token).safeTransferFrom(msg.sender, address(this), amount);

        address prevBidder = a.highestBidder;
        IERC20 prevToken = a.highestBidToken;
        uint256 prevAmount = a.highestBidAmount;

        a.highestBidder = msg.sender;
        a.highestBidToken = IERC20(_token);
        a.highestBidAmount = amount;
        a.highestBidUsdE8 = usdE8;

        if (a.hasBid[msg.sender]) {
            Bidders storage entry = a.bidders[a.bidderIndex[msg.sender]];
            entry.bidAmount = amount;
            entry.token = _token;
            entry.bidUsdE8 = usdE8;
            entry.fid = fid;
        } else {
            a.bidderIndex[msg.sender] = a.bidders.length;
            a.hasBid[msg.sender] = true;
            a.bidders.push(
                Bidders({
                    bidder: msg.sender,
                    bidAmount: amount,
                    token: _token,
                    bidUsdE8: usdE8,
                    fid: fid
                })
            );
        }

        // Fee is charged only on the winning bid at settlement, so an outbid
        // leader is made whole in the token they escrowed.
        if (prevBidder != address(0) && prevAmount > 0) {
            prevToken.safeTransfer(prevBidder, prevAmount);
        }

        emit BidPlaced(_auctionId, msg.sender, _token, amount, usdE8, fid);
    }

    // ------------------ SETTLE ------------------

    function endAuction(string memory _auctionId) external nonReentrant {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(!a.isFixedPrice, "Not an auction");
        require(!a.settled, "Already settled");
        require(msg.sender == a.owner, "Only auction owner can end");

        uint256 feeTaken;
        if (a.highestBidAmount > 0 && a.highestBidder != address(0)) {
            feeTaken = _settle(a, a.highestBidToken, a.highestBidAmount);
        } else {
            a.settled = true;
        }

        emit AuctionEnded(
            _auctionId,
            a.highestBidder,
            address(a.highestBidToken),
            a.highestBidAmount,
            a.highestBidUsdE8,
            a.owner,
            feeTaken
        );
    }

    /**
     * @notice Buys a fixed-price listing with `_token`.
     * @param _maxTokenAmount Most the buyer will part with. The USD price is
     *        fixed but the token rate is not, so this caps what a rate move
     *        between quote and confirmation can cost them.
     */
    function buyListing(
        string calldata _listingId,
        address _token,
        uint256 _maxTokenAmount,
        string calldata fid
    ) external nonReentrant {
        Auction storage a = auctions[_listingId];
        require(a.owner != address(0), "Listing not found");
        require(a.isFixedPrice, "Not a fixed-price listing");
        require(!a.settled, "Already sold");
        require(block.timestamp < a.deadline, "Listing expired");
        require(msg.sender != a.owner, "Cannot buy own listing");

        TokenConfig storage c = tokenConfig[_token];
        _requireUsable(c);

        uint256 amount = _usdToToken(c, a.priceUsdE8);
        require(amount <= _maxTokenAmount, "Price moved past your limit");

        IERC20(_token).safeTransferFrom(msg.sender, address(this), amount);

        a.highestBidder = msg.sender;
        a.highestBidToken = IERC20(_token);
        a.highestBidAmount = amount;
        a.highestBidUsdE8 = a.priceUsdE8;

        if (!a.hasBid[msg.sender]) {
            a.bidderIndex[msg.sender] = a.bidders.length;
            a.hasBid[msg.sender] = true;
            a.bidders.push(
                Bidders({
                    bidder: msg.sender,
                    bidAmount: amount,
                    token: _token,
                    bidUsdE8: a.priceUsdE8,
                    fid: fid
                })
            );
        }

        uint256 feeTaken = _settle(a, IERC20(_token), amount);
        emit ListingSold(_listingId, msg.sender, _token, amount, a.priceUsdE8, a.owner, feeTaken);
    }

    /// @dev Takes feePercent of `amount` to feeReceiver and the rest to the
    ///      listing owner, both in the token the buyer actually paid.
    function _settle(Auction storage a, IERC20 token, uint256 amount)
        internal
        returns (uint256 feeTaken)
    {
        require(!a.settled, "Already settled");
        a.settled = true;

        feeTaken = (amount * feePercent) / 10000;
        uint256 payout = amount - feeTaken;

        token.safeTransfer(a.owner, payout);
        if (feeTaken > 0) {
            token.safeTransfer(feeReceiver, feeTaken);
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
            priceUsdE8: a.priceUsdE8,
            highestBidUsdE8: a.highestBidUsdE8,
            highestBidder: a.highestBidder,
            highestBidToken: address(a.highestBidToken),
            highestBidAmount: a.highestBidAmount,
            isFixedPrice: a.isFixedPrice,
            settled: a.settled
        });
    }
}
