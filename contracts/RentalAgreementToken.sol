// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RentalAgreementToken
/// @notice ERC-721 khong chuyen nhuong, dai dien cho MOT hop dong thue cu the.
/// @dev Duoc RentalManager mint khi nguoi thue dat coc thanh cong (rentProperty).
///      tokenId trung voi propertyId ben RentalManager vi moi tai san chi duoc
///      thue dung mot lan trong vong doi hien tai, nen khong gian id khong bao
///      gio dung nhau. Token khong bao gio bi burn - giu lai vinh vien lam bang
///      chung lich su da tung thue, ke ca sau khi hop dong da ket thuc.
contract RentalAgreementToken is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    error TransferNotAllowed();
    error InvalidAddress();

    constructor(address admin) ERC721("Rental Agreement", "LEASE") {
        if (admin == address(0)) {
            revert InvalidAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Mint token dai dien cho mot luot thue, giao cho nguoi thue.
    /// @dev Chi RentalManager (duoc cap MINTER_ROLE sau khi deploy) moi goi duoc.
    function mintAgreement(
        address tenant,
        uint256 propertyId
    ) external onlyRole(MINTER_ROLE) {
        _safeMint(tenant, propertyId);
    }

    /// @dev Trong OpenZeppelin 5.x, mint/transfer/burn deu di qua _update().
    ///      Chi cho phep truong hop token chua co chu so huu (tuc mint); moi
    ///      cap nhat khac (chuyen nhuong hoac burn) deu bi chan.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            revert TransferNotAllowed();
        }
        return super._update(to, tokenId, auth);
    }

    /// @notice Hop dong thue khong the chuyen nhuong nen khong can approve.
    function approve(address, uint256) public pure override {
        revert TransferNotAllowed();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert TransferNotAllowed();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
