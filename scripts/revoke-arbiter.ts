import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Thu hoi ARBITER_ROLE cua 1 dia chi tren RentalManager da deploy - dung khi mot dia
// chi khong nen tiep tuc la trong tai nua (vd chinh vi admin/chu nha, tranh xung dot
// loi ich tu bo phieu cho tranh chap cua chinh minh). Khong anh huong DEFAULT_ADMIN_ROLE
// (van quan ly duoc cac vai tro khac sau khi thu hoi).
//
// Cach dung:
//   ARBITER_ADDRESS=0xDiaChiCanThuHoi npx hardhat run scripts/revoke-arbiter.ts --network sepolia

const targetAddress = process.env.ARBITER_ADDRESS;
if (!targetAddress || !targetAddress.startsWith("0x")) {
  console.error(
    "Thieu bien moi truong ARBITER_ADDRESS. Vi du: ARBITER_ADDRESS=0xDiaChiCanThuHoi npx hardhat run scripts/revoke-arbiter.ts --network sepolia",
  );
  process.exit(1);
}

const { ethers } = await hre.network.create();
const chainId = (await ethers.provider.getNetwork()).chainId;

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const deployedAddressesPath = path.join(
  rootDir,
  "ignition",
  "deployments",
  `chain-${chainId}`,
  "deployed_addresses.json",
);
if (!fs.existsSync(deployedAddressesPath)) {
  console.error(`Khong tim thay ${deployedAddressesPath}. Hay chay ignition deploy truoc.`);
  process.exit(1);
}
const deployed = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf-8")) as Record<string, string>;
const managerAddress = deployed["RentalSystemModule#RentalManager"];

const manager = await ethers.getContractAt("RentalManager", managerAddress);
const arbiterRole = await manager.ARBITER_ROLE();
const tx = await manager.revokeRole(arbiterRole, targetAddress);
await tx.wait();

console.log(`Da thu hoi ARBITER_ROLE cua ${targetAddress} tren RentalManager (${managerAddress}).`);
