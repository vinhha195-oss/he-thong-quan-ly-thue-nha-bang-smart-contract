// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RentalAgreementToken.sol";

/// @title RentalManager
/// @notice He thong quan ly thue nha bang smart contract (ban toi thieu, an toan).
/// @dev Contract giu tien coc; tien thue chuyen thang cho chu nha.
///      Dung ReentrancyGuard + checks-effects-interactions de tranh loi mat tien.
///      Thanh toan bang ETH thu nghiem (mang local / testnet).
///      Khong dung AccessControl cho nghiep vu chinh (listProperty/rentProperty/...)
///      vi day la thi truong khong can cap phep - ai cung co the dang tin lam chu
///      nha, quyen han duoc xac dinh bang du lieu (msg.sender == p.landlord) chu
///      khong phai vai tro duoc admin cap truoc. Chi RentalAgreementToken moi can
///      AccessControl (MINTER_ROLE) de gioi han quyen mint. Xem docs/lua-chon-token.md.
contract RentalManager is ReentrancyGuard {
    RentalAgreementToken public immutable agreementToken;

    error InvalidTokenAddress();

    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) {
            revert InvalidTokenAddress();
        }
        agreementToken = RentalAgreementToken(tokenAddress);
    }

    // Trang thai vong doi mot tai san/hop dong
    enum Status { Listed, Active, HandedOver, Ended }
    //             Dang cho thue / Dang thue / Da ban giao / Da ket thuc

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
    }

    uint256 public propertyCount;
    mapping(uint256 => Property) public properties;

    event PropertyListed(uint256 indexed id, address indexed landlord, string title, uint256 monthlyRent, uint256 deposit);
    event Rented(uint256 indexed id, address indexed tenant, uint256 depositPaid, uint256 startedAt);
    event RentPaid(uint256 indexed id, address indexed tenant, uint256 amount, uint256 paidAt);
    event HandoverConfirmed(uint256 indexed id, address indexed tenant, uint256 confirmedAt);
    event LeaseEnded(uint256 indexed id, uint256 refundToTenant, uint256 deductToLandlord, uint256 endedAt);

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
            landlord:     msg.sender,
            title:        title,
            location:     location,
            monthlyRent:  monthlyRent,
            deposit:      deposit,
            status:       Status.Listed,
            tenant:       address(0),
            depositHeld:  0,
            startedAt:    0,
            rentPaidCount:0,
            imageCID:     imageCID,
            note:         note
        });
        emit PropertyListed(propertyCount, msg.sender, title, monthlyRent, deposit);
        return propertyCount;
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

        emit Rented(id, msg.sender, msg.value, block.timestamp);

        // Mint token dai dien cho hop dong thue nay, giao cho nguoi thue.
        // Goi sau khi da cap nhat xong state (checks-effects-interactions).
        agreementToken.mintAgreement(msg.sender, id);
    }

    function payRent(uint256 id) external payable nonReentrant {
        Property storage p = properties[id];
        require(p.status == Status.Active, "Hop dong khong hoat dong");
        require(msg.sender == p.tenant, "Chi nguoi thue moi tra tien");
        require(msg.value == p.monthlyRent, "Phai tra dung tien thue");

        p.rentPaidCount += 1;
        emit RentPaid(id, msg.sender, msg.value, block.timestamp);

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

    function endLease(uint256 id, uint256 deductAmount) external nonReentrant {
        Property storage p = properties[id];
        require(p.status == Status.HandedOver, "Chua ban giao phong");
        require(msg.sender == p.landlord, "Chi chu nha moi ket thuc");
        require(deductAmount <= p.depositHeld, "Khau tru vuot qua tien coc");

        uint256 refund = p.depositHeld - deductAmount;
        address tenant = p.tenant;

        p.depositHeld = 0;
        p.status = Status.Ended;

        emit LeaseEnded(id, refund, deductAmount, block.timestamp);

        if (deductAmount > 0) {
            (bool ok1, ) = payable(p.landlord).call{value: deductAmount}("");
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
