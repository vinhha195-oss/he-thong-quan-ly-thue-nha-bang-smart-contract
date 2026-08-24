import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Cap ARBITER_ROLE cho 1 dia chi tren RentalManager da deploy - dung sau khi deploy
// that de co du >=2 trong tai doc lap cho co che multisig giai quyet tranh chap.
//
// Cach dung (Hardhat 3 khong cho truyen positional arg qua "hardhat run", nen dung
// bien moi truong):
//   ARBITER_ADDRESS=0xDiaChiTrongTai npx hardhat run scripts/grant-arbiter.ts --network sepolia

const targetAddress = process.env.ARBITER_ADDRESS;
if (!targetAddress || !targetAddress.startsWith("0x")) {
  console.error(
    "Thieu bien moi truong ARBITER_ADDRESS. Vi du: ARBITER_ADDRESS=0xDiaChiTrongTai npx hardhat run scripts/grant-arbiter.ts --network sepolia",
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
const tx = await manager.grantRole(arbiterRole, targetAddress);
await tx.wait();

console.log(`Da cap ARBITER_ROLE cho ${targetAddress} tren RentalManager (${managerAddress}).`);
