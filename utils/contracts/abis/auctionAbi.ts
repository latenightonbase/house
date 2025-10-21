export const auctionAbi = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_wallet1",
				"type": "address"
			},
			{
				"internalType": "address[3]",
				"name": "_walletGroup",
				"type": "address[3]"
			},
			{
				"internalType": "address",
				"name": "_finalRewardWallet",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_feePercent",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "string",
				"name": "auctionId",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "winner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "auctionOwner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "feeTaken",
				"type": "uint256"
			}
		],
		"name": "AuctionEnded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "string",
				"name": "auctionId",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "tokenName",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "deadline",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "minBidAmount",
				"type": "uint256"
			}
		],
		"name": "AuctionStarted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "string",
				"name": "auctionId",
				"type": "string"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "bidder",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "fid",
				"type": "string"
			}
		],
		"name": "BidPlaced",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "burnAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "rewardAmount",
				"type": "uint256"
			}
		],
		"name": "BurnAndRewardsHandled",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_auctionId",
				"type": "string"
			}
		],
		"name": "endAuction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newFeePercent",
				"type": "uint256"
			}
		],
		"name": "FeeSettingsUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "wallet1",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address[3]",
				"name": "group",
				"type": "address[3]"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "rewardWallet",
				"type": "address"
			}
		],
		"name": "FeeWalletsUpdated",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "handleBurnAndRewards",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_auctionId",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "fid",
				"type": "string"
			}
		],
		"name": "placeBid",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_auctionId",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "_token",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "_tokenName",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "durationHours",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_minBidAmount",
				"type": "uint256"
			}
		],
		"name": "startAuction",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_newPercent",
				"type": "uint256"
			}
		],
		"name": "updateFeeSettings",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_wallet1",
				"type": "address"
			},
			{
				"internalType": "address[3]",
				"name": "_walletGroup",
				"type": "address[3]"
			},
			{
				"internalType": "address",
				"name": "_finalRewardWallet",
				"type": "address"
			}
		],
		"name": "updateFeeWallets",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "BURN_TOKEN",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "feePercent",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "feeReceiver",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "feeWallet1",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "feeWalletGroup",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "finalRewardWallet",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_auctionId",
				"type": "string"
			}
		],
		"name": "getBidders",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "bidder",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "bidAmount",
						"type": "uint256"
					},
					{
						"internalType": "string",
						"name": "fid",
						"type": "string"
					}
				],
				"internalType": "struct Bidders[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "UNISWAP_V4_ROUTER",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "WETH_ADDRESS",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]