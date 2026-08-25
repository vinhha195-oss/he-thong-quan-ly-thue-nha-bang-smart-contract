// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RentalAgreementToken.sol";

/// @title RentalManager
/// @notice He thong quan ly thue nha bang smart contract.
/// @dev Contract giu tien coc; tien thue chuyen thang cho chu nha.
///      Dung ReentrancyGuard + checks-effects-interactions de tranh loi mat tien.
///      Thanh toan bang ETH thu nghiem (mang local / testnet).
///      Nghiep vu chinh (listProperty/rentProperty/payRent/confirmHandover) KHONG dung
///      AccessControl - day la thi truong khong can cap phep, ai cung dang tin/thue
///      duoc, quyen han xac dinh bang du lieu (msg.sender == p.landlord/tenant).
///      Chi 2 cho CAN AccessControl vi ban chat can mot ben duoc tin cay truoc:
///      RentalAgreementToken (MINTER_ROLE, xem file do) va ARBITER_ROLE o day (chi
///      dung khi tranh chap khau tru coc). Xem docs/lua-chon-token.md.
contract RentalManager is AccessControl, ReentrancyGuard {
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    RentalAgreementToken public immutable agreementToken;
    /// @notice Chu ky tinh han tra tien thue (giay). vd 2592000 = 30 ngay.
    uint256 public immutable rentPeriod;
    /// @notice Muc phat tra tre, tinh theo phan van (basis points, 500 = 5%).
    uint256 public immutable lateFeeBps;
    /// @notice So trong tai (ARBITER_ROLE) can dong thuan cung 1 muc khau tru moi
    ///         duoc thi hanh khi co tranh chap - day la co che "multisig" cho viec
    ///         giai ngan tien coc trong truong hop tranh chap.
    uint256 public immutable arbiterApprovalsRequired;

    error InvalidTokenAddress();
    error InvalidAdmin();
    error InvalidApprovalThreshold();

    constructor(
        address tokenAddress,
        address admin,
        uint256 rentPeriodSeconds,
        uint256 lateFeeBps_,
        uint256 arbiterApprovalsRequired_
    ) {
        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        if (admin == address(0)) revert InvalidAdmin();
        if (arbiterApprovalsRequired_ == 0) revert InvalidApprovalThreshold();

        agreementToken = RentalAgreementToken(tokenAddress);
        rentPeriod = rentPeriodSeconds;
        lateFeeBps = lateFeeBps_;
        arbiterApprovalsRequired = arbiterApprovalsRequired_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ARBITER_ROLE, admin);
    }

    // Trang thai vong doi mot tai san/hop dong
    enum Status { Listed, Active, HandedOver, Ended, Disputed, Cancelled }
    //             Dang cho thue / Dang thue / Da ban giao / Da ket thuc / Dang tranh chap / Da huy

    struct Property {
        address landlord;
        string  title;
        string  location;
        uint256 monthlyRent;
        uint256 deposit;
        Status  status;
        address tenant;
        uint256 depositHeld;
        uint256 startedAt;
        uint256 rentPaidCount;
        string  imageCID; // CID cua anh phong tren IPFS, co the rong ("") neu khong dinh kem
        string  note; // Ghi chu them cua chu nha (vd noi quy, luu y), co the rong
        uint256 nextDueDate; // Han tra tien ky tiep theo (unix seconds); qua han -> tinh phat
        uint256 proposedDeduction; // Muc khau tru chu nha de xuat khi ket thuc hop dong
        bool    settlementProposed; // Da co de xuat tat toan dang cho nguoi thue phan hoi
    }

    uint256 public propertyCount;
    mapping(uint256 => Property) public properties;

    // propertyId => muc khau tru de xuat => so trong tai da duyet muc do (co che multisig)
    mapping(uint256 => mapping(uint256 => uint256)) public disputeVotes;
    // propertyId => trong tai => da vote cho tranh chap nay chua (chan vote 2 lan)
    mapping(uint256 => mapping(address => bool)) public hasVotedOnDispute;

    event PropertyListed(uint256 indexed id, address indexed landlord, string title, uint256 monthlyRent, uint256 deposit);
    event Rented(uint256 indexed id, address indexed tenant, uint256 depositPaid, uint256 startedAt);
    event RentPaid(uint256 indexed id, address indexed tenant, uint256 amount, uint256 latePenalty, uint256 paidAt);
    event HandoverConfirmed(uint256 indexed id, address indexed tenant, uint256 confirmedAt);
    event SettlementProposed(uint256 indexed id, uint256 deductAmount);
    event DisputeRaised(uint256 indexed id, address indexed tenant);
    event DisputeVoteCast(uint256 indexed id, address indexed arbiter, uint256 deductAmount, uint256 voteCount);
    event LeaseEnded(uint256 indexed id, uint256 refundToTenant, uint256 deductToLandlord, uint256 endedAt);
    event ListingCancelled(uint256 indexed id, address indexed landlord);

    function listProperty(
        string calldata title,
        string calldata location,
        uint256 monthlyRent,
        uint256 deposit,
        string calldata imageCID,
        string calldata note
    ) external returns (uint256) {
        require(monthlyRent > 0, "Tien thue phai > 0");
        propertyCount++;
        properties[propertyCount] = Property({
            landlord:           msg.sender,
            title:              title,
            location:           location,
            monthlyRent:        monthlyRent,
            deposit:            deposit,
            status:             Status.Listed,
            tenant:             address(0),
            depositHeld:        0,
            startedAt:          0,
            rentPaidCount:      0,
            imageCID:           imageCID,
            note:               note,
            nextDueDate:        0,
            proposedDeduction:  0,
            settlementProposed: false
        });
        emit PropertyListed(propertyCount, msg.sender, title, monthlyRent, deposit);
        return propertyCount;
    }

    /// @notice Chu nha huy tin dang cho thue - chi khi CHUA co ai dat coc (con Listed).
    ///         Vi du bat buoc de sua sai (vd nhap nham gia) khi cac truong cua Property
    ///         khong the chinh sua lai duoc sau khi da listProperty.
    function cancelListing(uint256 id) external {
        Property storage p = properties[id];
        require(p.landlord != address(0), "Tai san khong ton tai");
        require(msg.sender == p.landlord, "Chi chu nha moi huy duoc");
        require(p.status == Status.Listed, "Tai san khong con trong");

        p.status = Status.Cancelled;
        emit ListingCancelled(id, msg.sender);
    }

    function rentProperty(uint256 id) external payable nonReentrant {
        Property storage p = properties[id];
        require(p.landlord != address(0), "Tai san khong ton tai");
        require(p.status == Status.Listed, "Tai san khong con trong");
        require(msg.sender != p.landlord, "Chu nha khong the tu thue");
        require(msg.value == p.deposit, "Phai dat coc dung so tien");

        p.tenant = msg.sender;
        p.depositHeld = msg.value;
        p.status = Status.Active;
        p.startedAt = block.timestamp;
        p.nextDueDate = block.timestamp + rentPeriod;

        emit Rented(id, msg.sender, msg.value, block.timestamp);

        // Mint token dai dien cho hop dong thue nay, giao cho nguoi thue.
        // Goi sau khi da cap nhat xong state (checks-effects-interactions).
        agreementToken.mintAgreement(msg.sender, id);
    }

    /// @notice Tra tien thue ky hien tai. Qua han (block.timestamp > nextDueDate) thi
    ///         phai tra kem phat tre `lateFeeBps` tren tien thue.
    function payRent(uint256 id) external payable nonReentrant {
        Property storage p = properties[id];
        require(p.status == Status.Active, "Hop dong khong hoat dong");
        require(msg.sender == p.tenant, "Chi nguoi thue moi tra tien");

        uint256 penalty = block.timestamp > p.nextDueDate
            ? (p.monthlyRent * lateFeeBps) / 10000
            : 0;
        uint256 required = p.monthlyRent + penalty;
        require(msg.value == required, "Phai tra dung tien thue (cong phat tre neu qua han)");

        p.rentPaidCount += 1;
        p.nextDueDate += rentPeriod;
        emit RentPaid(id, msg.sender, msg.value, penalty, block.timestamp);

        (bool ok, ) = payable(p.landlord).call{value: msg.value}("");
        require(ok, "Chuyen tien that bai");
    }

    function confirmHandover(uint256 id) external {
        Property storage p = properties[id];
        require(p.status == Status.Active, "Hop dong khong hoat dong");
        require(msg.sender == p.tenant, "Chi nguoi thue moi xac nhan");

        p.status = Status.HandedOver;
        emit HandoverConfirmed(id, msg.sender, block.timestamp);
    }

    /// @notice Chu nha de xuat muc khau tru tien coc. Chua chuyen tien ngay - phai cho
    ///         nguoi thue dong y (acceptSettlement) hoac khieu nai (disputeSettlement).
    function proposeSettlement(uint256 id, uint256 deductAmount) external {
        Property storage p = properties[id];
        require(p.status == Status.HandedOver, "Chua ban giao phong");
        require(msg.sender == p.landlord, "Chi chu nha moi de xuat");
        require(deductAmount <= p.depositHeld, "Khau tru vuot qua tien coc");

        p.proposedDeduction = deductAmount;
        p.settlementProposed = true;
        emit SettlementProposed(id, deductAmount);
    }

    /// @notice Nguoi thue dong y muc chu nha de xuat -> tat toan ngay theo muc do.
    function acceptSettlement(uint256 id) external nonReentrant {
        Property storage p = properties[id];
        require(p.status == Status.HandedOver, "Chua ban giao phong");
        require(p.settlementProposed, "Chua co de xuat tat toan");
        require(msg.sender == p.tenant, "Chi nguoi thue moi dong y");

        _settle(id, p.proposedDeduction);
    }

    /// @notice Nguoi thue khong dong y muc de xuat -> chuyen sang trong tai xu ly.
    function disputeSettlement(uint256 id) external {
        Property storage p = properties[id];
        require(p.status == Status.HandedOver, "Chua ban giao phong");
        require(p.settlementProposed, "Chua co de xuat tat toan");
        require(msg.sender == p.tenant, "Chi nguoi thue moi khieu nai");

        p.status = Status.Disputed;
        emit DisputeRaised(id, msg.sender);
    }

    /// @notice Trong tai (ARBITER_ROLE) bo phieu cho 1 muc khau tru cu the. Khi du so
    ///         phieu `arbiterApprovalsRequired` cung dong y 1 muc -> tu dong tat toan
    ///         theo muc do (co che multisig N-trong-M cho giai ngan tien coc tranh chap).
    function voteOnDispute(uint256 id, uint256 deductAmount) external onlyRole(ARBITER_ROLE) nonReentrant {
        Property storage p = properties[id];
        require(p.status == Status.Disputed, "Tai san khong trong trang thai tranh chap");
        require(deductAmount <= p.depositHeld, "Khau tru vuot qua tien coc");
        require(!hasVotedOnDispute[id][msg.sender], "Trong tai nay da bo phieu roi");

        hasVotedOnDispute[id][msg.sender] = true;
        uint256 votes = disputeVotes[id][deductAmount] + 1;
        disputeVotes[id][deductAmount] = votes;
        emit DisputeVoteCast(id, msg.sender, deductAmount, votes);

        if (votes >= arbiterApprovalsRequired) {
            _settle(id, deductAmount);
        }
    }

    function _settle(uint256 id, uint256 deductAmount) private {
        Property storage p = properties[id];
        uint256 refund = p.depositHeld - deductAmount;
        address tenant = p.tenant;
        address landlord = p.landlord;

        p.depositHeld = 0;
        p.status = Status.Ended;
        p.settlementProposed = false;

        emit LeaseEnded(id, refund, deductAmount, block.timestamp);

        if (deductAmount > 0) {
            (bool ok1, ) = payable(landlord).call{value: deductAmount}("");
            require(ok1, "Chuyen khau tru that bai");
        }
        if (refund > 0) {
            (bool ok2, ) = payable(tenant).call{value: refund}("");
            require(ok2, "Hoan coc that bai");
        }
    }

    function getProperty(uint256 id) external view returns (Property memory) {
        return properties[id];
    }

    function getAllProperties() external view returns (Property[] memory) {
        Property[] memory list = new Property[](propertyCount);
        for (uint256 i = 1; i <= propertyCount; i++) {
            list[i - 1] = properties[i];
        }
        return list;
    }
}
