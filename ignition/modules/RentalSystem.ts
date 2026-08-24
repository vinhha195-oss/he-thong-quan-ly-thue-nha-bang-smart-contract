import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { id } from "ethers";

const MINTER_ROLE = id("MINTER_ROLE");

// Cau hinh mac dinh cho RentalManager - co the ghi de bang file parameters khi deploy
// (vd rut ngan rentPeriodSeconds de demo phat tra tre khong phai cho 30 ngay that).
const DEFAULT_RENT_PERIOD_SECONDS = 30 * 24 * 60 * 60; // 30 ngay
const DEFAULT_LATE_FEE_BPS = 500; // 5%
const DEFAULT_ARBITER_APPROVALS_REQUIRED = 2; // multisig 2-trong-N trong tai

/**
 * Trien khai RentalAgreementToken (token, dai dien mot hop dong thue cu the)
 * roi den RentalManager (nghiep vu), sau do cap MINTER_ROLE cho RentalManager
 * de contract nay duoc phep mint token khi co nguoi dat coc.
 */
export default buildModule("RentalSystemModule", (m) => {
  const admin = m.getAccount(0);
  const rentPeriodSeconds = m.getParameter("rentPeriodSeconds", DEFAULT_RENT_PERIOD_SECONDS);
  const lateFeeBps = m.getParameter("lateFeeBps", DEFAULT_LATE_FEE_BPS);
  const arbiterApprovalsRequired = m.getParameter(
    "arbiterApprovalsRequired",
    DEFAULT_ARBITER_APPROVALS_REQUIRED,
  );

  const agreementToken = m.contract("RentalAgreementToken", [admin]);
  const rentalManager = m.contract("RentalManager", [
    agreementToken,
    admin,
    rentPeriodSeconds,
    lateFeeBps,
    arbiterApprovalsRequired,
  ]);

  m.call(agreementToken, "grantRole", [MINTER_ROLE, rentalManager], {
    from: admin,
    id: "GrantManagerMinterRole",
  });

  return { agreementToken, rentalManager };
});
