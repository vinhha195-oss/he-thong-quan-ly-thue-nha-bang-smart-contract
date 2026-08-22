import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ghi dia chi + ABI cua RentalManager (da deploy bang Hardhat Ignition)
// sang frontend/src/config.js, thay the cho scripts/deploy.js kieu cu.
//
// Cach dung: tsx scripts/sync-frontend-config.ts <localhost|sepolia>

const CHAIN_IDS: Record<string, number> = {
  localhost: 31337,
  sepolia: 11155111,
};

const networkName = process.argv[2];
if (!networkName || !(networkName in CHAIN_IDS)) {
  console.error("Su dung: tsx scripts/sync-frontend-config.ts <localhost|sepolia>");
  process.exit(1);
}

const chainId = CHAIN_IDS[networkName];
const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const deployedAddressesPath = path.join(
  rootDir,
  "ignition",
  "deployments",
  `chain-${chainId}`,
  "deployed_addresses.json",
);

if (!fs.existsSync(deployedAddressesPath)) {
  console.error(
    `Khong tim thay ${deployedAddressesPath}. Hay chay ignition deploy truoc.`,
  );
  process.exit(1);
}

const deployedAddresses = JSON.parse(
  fs.readFileSync(deployedAddressesPath, "utf-8"),
) as Record<string, string>;

const managerAddress = deployedAddresses["RentalSystemModule#RentalManager"];
if (!managerAddress) {
  console.error(
    "Khong tim thay dia chi RentalManager trong deployed_addresses.json",
  );
  process.exit(1);
}

const artifactPath = path.join(
  rootDir,
  "artifacts",
  "contracts",
  "RentalManager.sol",
  "RentalManager.json",
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

const frontendDir = path.join(rootDir, "frontend", "src");
fs.mkdirSync(frontendDir, { recursive: true });

const configContent =
  "// File nay duoc tao tu dong boi scripts/sync-frontend-config.ts - KHONG sua tay.\n" +
  `export const CONTRACT_ADDRESS = "${managerAddress}";\n` +
  `export const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};\n`;

fs.writeFileSync(path.join(frontendDir, "config.js"), configContent);
console.log(
  `Da ghi cau hinh RentalManager (${managerAddress}) sang frontend/src/config.js`,
);
