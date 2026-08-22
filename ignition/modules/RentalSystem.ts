import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { id } from "ethers";

const MINTER_ROLE = id("MINTER_ROLE");

/**
 * Trien khai RentalAgreementToken (token, dai dien mot hop dong thue cu the)
 * roi den RentalManager (nghiep vu), sau do cap MINTER_ROLE cho RentalManager
 * de contract nay duoc phep mint token khi co nguoi dat coc.
 */
export default buildModule("RentalSystemModule", (m) => {
  const admin = m.getAccount(0);

  const agreementToken = m.contract("RentalAgreementToken", [admin]);
  const rentalManager = m.contract("RentalManager", [agreementToken]);

  m.call(agreementToken, "grantRole", [MINTER_ROLE, rentalManager], {
    from: admin,
    id: "GrantManagerMinterRole",
  });

  return { agreementToken, rentalManager };
});
