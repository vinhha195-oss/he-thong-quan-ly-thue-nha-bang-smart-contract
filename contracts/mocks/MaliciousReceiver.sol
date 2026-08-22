// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IRentalManagerLike {
    function rentProperty(uint256 id) external payable;
}

/// @title MaliciousReceiver
/// @notice Chi dung trong test bao mat: gia lam nguoi thue la mot smart contract,
///         co gang goi lai rentProperty() ngay trong callback onERC721Received
///         (duoc kich hoat boi _safeMint khi RentalManager.rentProperty mint token
///         cho no) de kiem chung nonReentrant chan duoc kieu tan cong nay.
contract MaliciousReceiver is IERC721Receiver {
    IRentalManagerLike public immutable manager;
    uint256 public reentryTargetId;
    uint256 public reentryValue;
    bool public attack;

    constructor(address managerAddress) {
        manager = IRentalManagerLike(managerAddress);
    }

    /// @param id Tai san se thue lan dau (kich hoat mint -> onERC721Received).
    /// @param targetIdForReentry Tai san khac se thu thue lai ngay trong callback.
    /// @dev msg.value phai du cho ca hai deposit: deposit(id) + deposit(targetIdForReentry).
    ///      Deposit cua lan tan cong tai lai duoc gui kem dung so tien (reentryValue), de
    ///      chung minh chinh nonReentrant la thu chan duoc no - chu khong phai vi thieu tien coc.
    function attackRentProperty(
        uint256 id,
        uint256 targetIdForReentry,
        uint256 reentryDeposit
    ) external payable {
        attack = true;
        reentryTargetId = targetIdForReentry;
        reentryValue = reentryDeposit;
        manager.rentProperty{value: msg.value - reentryDeposit}(id);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external returns (bytes4) {
        if (attack) {
            attack = false;
            // Thu goi lai rentProperty cho mot tai san khac, kem dung tien coc, ngay
            // trong callback mint. Neu ReentrancyGuard hoat dong dung, dong nay phai revert.
            manager.rentProperty{value: reentryValue}(reentryTargetId);
        }
        return this.onERC721Received.selector;
    }

    receive() external payable {}
}
