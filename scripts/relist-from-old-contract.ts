import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Doc lai cac tin dang con "Listed" tren contract CU (truoc khi them cancelListing va
// deploy lai) roi dang lai y het len contract MOI - vi contract moi khong co co che
// "nhap khau" du lieu tu contract khac, day la cach duy nhat de khoi phuc nhanh thay vi
// bam tay tung tin qua giao dien.
//
// CHI dang lai duoc nhung tin: (1) con o trang thai Listed (chua ai dat coc - tin da
// cho thue/da ket thuc thi khong tai tao day du duoc vi can ca chu ky private key nguoi
// thue), va (2) co landlord TRUNG voi vi dang chay script nay (khong the "dang ho" mot
// dia chi khac ma khong co private key cua ho).
//
// Cach dung: npx hardhat run scripts/relist-from-old-contract.ts --network sepolia

const OLD_MANAGER_ADDRESS = "0x8Ae7a8fE1Ef2C049d74171FB981f24459f3522Cc";

const OLD_ABI = [
  "function getAllProperties() view returns (tuple(address landlord,string title,string location,uint256 monthlyRent,uint256 deposit,uint8 status,address tenant,uint256 depositHeld,uint256 startedAt,uint256 rentPaidCount,string imageCID,string note,uint256 nextDueDate,uint256 proposedDeduction,bool settlementProposed)[])",
];

const { ethers } = await hre.network.create();
const [signer] = await ethers.getSigners();
const chainId = (await ethers.provider.getNetwork()).chainId;

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const deployedAddressesPath = path.join(
  rootDir, "ignition", "deployments", `chain-${chainId}`, "deployed_addresses.json",
);
if (!fs.existsSync(deployedAddressesPath)) {
  console.error(`Khong tim thay ${deployedAddressesPath}. Hay chay ignition deploy truoc.`);
  process.exit(1);
}
const deployed = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf-8")) as Record<string, string>;
const newManagerAddress = deployed["RentalSystemModule#RentalManager"];

const newArtifactPath = path.join(rootDir, "artifacts", "contracts", "RentalManager.sol", "RentalManager.json");
const newArtifact = JSON.parse(fs.readFileSync(newArtifactPath, "utf-8"));

const oldContract = new ethers.Contract(OLD_MANAGER_ADDRESS, OLD_ABI, ethers.provider);
const newContract = new ethers.Contract(newManagerAddress, newArtifact.abi, signer);

const signerAddress = (await signer.getAddress()).toLowerCase();
console.log(`Vi dang chay script: ${signerAddress}`);
console.log(`Contract cu (nguon doc): ${OLD_MANAGER_ADDRESS}`);
console.log(`Contract moi (dang lai vao day): ${newManagerAddress}\n`);

const oldProperties = await oldContract.getAllProperties();
let relisted = 0;
let skipped = 0;

for (let i = 0; i < oldProperties.length; i++) {
  const p = oldProperties[i];
  const oldId = i + 1;
  const isListed = Number(p.status) === 0;
  const isOwnListing = p.landlord.toLowerCase() === signerAddress;

  if (!isListed) {
    console.log(`[bo qua] #${oldId} "${p.title}" - khong con o trang thai Listed (status=${p.status}), co lich su thue/tra tien khong tai tao lai duoc.`);
    skipped++;
    continue;
  }
  if (!isOwnListing) {
    console.log(`[bo qua] #${oldId} "${p.title}" - chu nha la ${p.landlord}, khac vi dang chay script (${signerAddress}). Chu tin nay can tu dang lai qua giao dien.`);
    skipped++;
    continue;
  }

  console.log(`[dang lai] #${oldId} "${p.title}"...`);
  const tx = await newContract.listProperty(p.title, p.location, p.monthlyRent, p.deposit, p.imageCID, p.note);
  await tx.wait();
  relisted++;
}

console.log(`\nHoan tat: dang lai ${relisted} tin, bo qua ${skipped} tin.`);
