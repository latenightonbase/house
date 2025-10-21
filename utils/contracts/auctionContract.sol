// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

interface IUniswapV4Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

interface IBurnableToken is IERC20 {
    function burn(uint256 amount) external;
}

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
    mapping(string => Auction) private auctions;
    string[] private allAuctionIds;

    uint256 public feePercent;
    address public feeReceiver; // unused, backward compat

    // Constants
    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant UNISWAP_V4_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant BURN_TOKEN = 0x8C32bcFC720FEC35443748A96030cE866d0665ff;

    // Fee split wallets (modifiable)
    address public feeWallet1;
    address[3] public feeWalletGroup;
    address public finalRewardWallet;

    event BidPlaced(string indexed auctionId, address indexed bidder, uint256 amount, string fid);
    event AuctionEnded(string indexed auctionId, address winner, uint256 amount, address auctionOwner, uint256 feeTaken);
    event AuctionStarted(string indexed auctionId, address owner, string tokenName, uint256 deadline, uint256 minBidAmount);
    event BurnAndRewardsHandled(uint256 burnAmount, uint256 rewardAmount);
    event FeeSettingsUpdated(uint256 newFeePercent);
    event FeeWalletsUpdated(address wallet1, address[3] group, address rewardWallet);

    constructor(
        address _wallet1,
        address[3] memory _walletGroup,
        address _finalRewardWallet,
        uint256 _feePercent
    ) Ownable(_wallet1) {
        require(_feePercent <= 1000, "Fee too high (>10%)");
        feeWallet1 = _wallet1;
        feeWalletGroup = _walletGroup;
        finalRewardWallet = _finalRewardWallet;
        feePercent = _feePercent;
    }

    // ------------------ CONFIGURATION ------------------

    function updateFeeSettings(uint256 _newPercent) external onlyOwner {
        require(_newPercent <= 1000, "Fee too high (>10%)");
        feePercent = _newPercent;
        emit FeeSettingsUpdated(_newPercent);
    }

    function updateFeeWallets(
        address _wallet1,
        address[3] calldata _walletGroup,
        address _finalRewardWallet
    ) external onlyOwner {
        require(_wallet1 != address(0), "Invalid wallet1");
        require(_finalRewardWallet != address(0), "Invalid reward wallet");
        for (uint256 i = 0; i < 3; i++) {
            require(_walletGroup[i] != address(0), "Invalid group wallet");
            feeWalletGroup[i] = _walletGroup[i];
        }
        feeWallet1 = _wallet1;
        finalRewardWallet = _finalRewardWallet;
        emit FeeWalletsUpdated(_wallet1, _walletGroup, _finalRewardWallet);
    }

    // ------------------ AUCTION LOGIC ------------------

    function startAuction(
        string calldata _auctionId,
        address _token,
        string calldata _tokenName,
        uint256 durationHours,
        uint256 _minBidAmount
    ) external {
        require(bytes(_auctionId).length > 0, "Auction ID required");
        require(auctions[_auctionId].owner == address(0), "Auction already exists");
        require(_activeAuctionCount(msg.sender) < 3, "Max 3 active auctions per owner");
        require(_minBidAmount > 0, "Min bid > 0");

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

    function _activeAuctionCount(address _owner) internal view returns (uint256 count) {
        for (uint256 i = 0; i < allAuctionIds.length; i++) {
            Auction storage a = auctions[allAuctionIds[i]];
            if (a.deadline > block.timestamp && a.owner == _owner) count++;
        }
    }

    function placeBid(string memory _auctionId, uint256 amount, string memory fid) public {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(block.timestamp < a.deadline, "Auction ended");
        require(amount >= a.minBidAmount, "Bid below minimum");
        require(amount > a.highestBid, "Bid too low");

        require(a.erc20.transferFrom(msg.sender, address(this), amount), "Transfer failed");

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

    // ------------------ END AUCTION ------------------

    function endAuction(string memory _auctionId) external {
        Auction storage a = auctions[_auctionId];
        require(a.owner != address(0), "Auction not found");
        require(msg.sender == a.owner, "Only auction owner can end");

        uint256 feeTaken;
        uint256 payout;

        if (a.highestBid > 0 && a.highestBidder != address(0)) {
            feeTaken = (a.highestBid * feePercent) / 10000;
            payout = a.highestBid - feeTaken;

            // 1️⃣ Pay auction owner (sale proceeds)
            require(a.erc20.transfer(a.owner, payout), "Payout failed");

            // 2️⃣ Swap only feeTaken -> WETH
            IERC20 token = a.erc20;
            IUniswapV4Router router = IUniswapV4Router(UNISWAP_V4_ROUTER);
            token.approve(address(router), feeTaken);

            IUniswapV4Router.ExactInputSingleParams memory params = IUniswapV4Router.ExactInputSingleParams({
                tokenIn: address(token),
                tokenOut: WETH_ADDRESS,
                fee: 3000,
                recipient: address(this),
                amountIn: feeTaken,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

            uint256 wethReceived = router.exactInputSingle(params);

            // 3️⃣ Distribute first 37.5%
            uint256 firstPart = (wethReceived * 3750) / 10000;


            uint256 part1 = (firstPart * 1) / 3;
            uint256 part2 = (firstPart * 2) / 3;

            IERC20 weth = IERC20(WETH_ADDRESS);
            weth.transfer(feeWallet1, part1);
            uint256 each = part2 / 3;
            for (uint256 i = 0; i < 3; i++) {
                weth.transfer(feeWalletGroup[i], each);
            }

            // Remaining WETH stays in contract
            a.bids[a.highestBidder] = 0;
        }

        emit AuctionEnded(_auctionId, a.highestBidder, a.highestBid, a.owner, feeTaken);
        a.highestBidder = address(0);
        a.highestBid = 0;
    }

    // ------------------ HANDLE BURN + REWARD ------------------

    function handleBurnAndRewards() external onlyOwner {
        IERC20 weth = IERC20(WETH_ADDRESS);
        uint256 totalWeth = weth.balanceOf(address(this));
        require(totalWeth > 0, "No WETH to process");

        uint256 burnPortion = (totalWeth * 3) / 5;
        uint256 rewardPortion = totalWeth - burnPortion;

        // 1️⃣ Swap 3/5 WETH -> Burn token, then burn
        weth.approve(UNISWAP_V4_ROUTER, burnPortion);
        IUniswapV4Router.ExactInputSingleParams memory params = IUniswapV4Router.ExactInputSingleParams({
            tokenIn: WETH_ADDRESS,
            tokenOut: BURN_TOKEN,
            fee: 3000,
            recipient: address(this),
            amountIn: burnPortion,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        uint256 tokensBought = IUniswapV4Router(UNISWAP_V4_ROUTER).exactInputSingle(params);
        IBurnableToken(BURN_TOKEN).burn(tokensBought);

        // 2️⃣ Send 2/5 WETH to final reward wallet
        weth.transfer(finalRewardWallet, rewardPortion);

        emit BurnAndRewardsHandled(burnPortion, rewardPortion);
    }
}