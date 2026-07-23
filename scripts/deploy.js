// Script deploy contract RentalManager.
// Sau khi deploy, tu dong ghi dia chi + ABI sang frontend/src/config.js
// de giao dien khong phai copy-paste thu cong.

const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const RentalManager = await hre.ethers.getContractFactory("RentalManager");
  const contract = await RentalManager.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("RentalManager da deploy tai dia chi:", address);

  // Lay ABI tu artifact
  const artifact = await hre.artifacts.readArtifact("RentalManager");

  // Ghi file config cho frontend
  const frontendDir = path.join(__dirname, "..", "frontend", "src");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const configContent =
    "// File nay duoc tao tu dong boi scripts/deploy.js - KHONG sua tay.\n" +
    "export const CONTRACT_ADDRESS = \"" + address + "\";\n" +
    "export const CONTRACT_ABI = " + JSON.stringify(artifact.abi, null, 2) + ";\n";

  fs.writeFileSync(path.join(frontendDir, "config.js"), configContent);
  console.log("Da ghi cau hinh sang frontend/src/config.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
