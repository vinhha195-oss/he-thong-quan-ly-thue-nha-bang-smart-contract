// ABI toi thieu cua RentalManager - chi nhung gi backend can doc.
export const MANAGER_ABI = [
  "event PropertyListed(uint256 indexed id, address indexed landlord, string title, uint256 monthlyRent, uint256 deposit)",
  "event Rented(uint256 indexed id, address indexed tenant, uint256 depositPaid, uint256 startedAt)",
  "event RentPaid(uint256 indexed id, address indexed tenant, uint256 amount, uint256 paidAt)",
  "event HandoverConfirmed(uint256 indexed id, address indexed tenant, uint256 confirmedAt)",
  "event LeaseEnded(uint256 indexed id, uint256 refundToTenant, uint256 deductToLandlord, uint256 endedAt)",
  "function getProperty(uint256 id) view returns (tuple(address landlord, string title, string location, uint256 monthlyRent, uint256 deposit, uint8 status, address tenant, uint256 depositHeld, uint256 startedAt, uint256 rentPaidCount, string imageCID))",
] as const;
