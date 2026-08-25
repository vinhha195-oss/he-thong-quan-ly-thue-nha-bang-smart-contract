// ABI toi thieu cua RentalManager - chi nhung gi backend can doc.
export const MANAGER_ABI = [
  "event PropertyListed(uint256 indexed id, address indexed landlord, string title, uint256 monthlyRent, uint256 deposit)",
  "event Rented(uint256 indexed id, address indexed tenant, uint256 depositPaid, uint256 startedAt)",
  "event RentPaid(uint256 indexed id, address indexed tenant, uint256 amount, uint256 latePenalty, uint256 paidAt)",
  "event HandoverConfirmed(uint256 indexed id, address indexed tenant, uint256 confirmedAt)",
  "event SettlementProposed(uint256 indexed id, uint256 deductAmount)",
  "event DisputeRaised(uint256 indexed id, address indexed tenant)",
  "event DisputeVoteCast(uint256 indexed id, address indexed arbiter, uint256 deductAmount, uint256 voteCount)",
  "event LeaseEnded(uint256 indexed id, uint256 refundToTenant, uint256 deductToLandlord, uint256 endedAt)",
  "event ListingCancelled(uint256 indexed id, address indexed landlord)",
  "function getProperty(uint256 id) view returns (tuple(address landlord, string title, string location, uint256 monthlyRent, uint256 deposit, uint8 status, address tenant, uint256 depositHeld, uint256 startedAt, uint256 rentPaidCount, string imageCID, string note, uint256 nextDueDate, uint256 proposedDeduction, bool settlementProposed))",
] as const;
