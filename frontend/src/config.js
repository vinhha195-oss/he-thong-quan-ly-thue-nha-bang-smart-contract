// File nay duoc tao tu dong boi scripts/sync-frontend-config.ts - KHONG sua tay.
export const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidTokenAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tenant",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "confirmedAt",
        "type": "uint256"
      }
    ],
    "name": "HandoverConfirmed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "refundToTenant",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "deductToLandlord",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endedAt",
        "type": "uint256"
      }
    ],
    "name": "LeaseEnded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "landlord",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "monthlyRent",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "deposit",
        "type": "uint256"
      }
    ],
    "name": "PropertyListed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tenant",
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
        "internalType": "uint256",
        "name": "paidAt",
        "type": "uint256"
      }
    ],
    "name": "RentPaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tenant",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "depositPaid",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startedAt",
        "type": "uint256"
      }
    ],
    "name": "Rented",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "agreementToken",
    "outputs": [
      {
        "internalType": "contract RentalAgreementToken",
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
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "confirmHandover",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deductAmount",
        "type": "uint256"
      }
    ],
    "name": "endLease",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllProperties",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "landlord",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "location",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "monthlyRent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deposit",
            "type": "uint256"
          },
          {
            "internalType": "enum RentalManager.Status",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "tenant",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "depositHeld",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rentPaidCount",
            "type": "uint256"
          }
        ],
        "internalType": "struct RentalManager.Property[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getProperty",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "landlord",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "location",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "monthlyRent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deposit",
            "type": "uint256"
          },
          {
            "internalType": "enum RentalManager.Status",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "tenant",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "depositHeld",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rentPaidCount",
            "type": "uint256"
          }
        ],
        "internalType": "struct RentalManager.Property",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "monthlyRent",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deposit",
        "type": "uint256"
      }
    ],
    "name": "listProperty",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "payRent",
    "outputs": [],
    "stateMutability": "payable",
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
    "name": "properties",
    "outputs": [
      {
        "internalType": "address",
        "name": "landlord",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "monthlyRent",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deposit",
        "type": "uint256"
      },
      {
        "internalType": "enum RentalManager.Status",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "tenant",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "depositHeld",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rentPaidCount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "propertyCount",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "rentProperty",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];
