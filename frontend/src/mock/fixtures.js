import { ethers } from "ethers";

// Cac dia chi test cong khai cua Hardhat/Anvil (tai khoan #0/#1/#2 mac dinh),
// dung lam du lieu mau — khong lien quan vi that.
export const MOCK_ACCOUNTS = {
  landlord: { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", label: "Chủ nhà (mẫu)" },
  tenant: { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", label: "Người thuê (mẫu)" },
  other: { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", label: "Người lạ (mẫu)" },
};

const { landlord, tenant } = MOCK_ACCOUNTS;
const eth = (n) => ethers.parseEther(n);

// Du lieu khoi tao — bao phu ca 4 trang thai (Listed/Active/HandedOver/Ended)
// de thiet ke UI khong can cho contract that.
export function createInitialProperties() {
  return [
    {
      id: 1,
      landlord: landlord.address,
      title: "Phòng trọ Quận 1, 25m²",
      location: "TP. Hồ Chí Minh",
      monthlyRent: eth("1"),
      deposit: eth("2"),
      status: 0, // Listed
      tenant: ethers.ZeroAddress,
      depositHeld: 0n,
      rentPaidCount: 0,
    },
    {
      id: 2,
      landlord: landlord.address,
      title: "Căn hộ mini Quận 7",
      location: "TP. Hồ Chí Minh",
      monthlyRent: eth("0.5"),
      deposit: eth("1"),
      status: 1, // Active
      tenant: tenant.address,
      depositHeld: eth("1"),
      rentPaidCount: 1,
    },
    {
      id: 3,
      landlord: landlord.address,
      title: "Nhà nguyên căn Thủ Đức",
      location: "TP. Hồ Chí Minh",
      monthlyRent: eth("3"),
      deposit: eth("6"),
      status: 2, // HandedOver
      tenant: tenant.address,
      depositHeld: eth("6"),
      rentPaidCount: 3,
    },
    {
      id: 4,
      landlord: landlord.address,
      title: "Phòng trọ Bình Thạnh",
      location: "TP. Hồ Chí Minh",
      monthlyRent: eth("1.2"),
      deposit: eth("2.4"),
      status: 3, // Ended
      tenant: tenant.address,
      depositHeld: 0n,
      rentPaidCount: 4,
    },
  ];
}

export function createInitialHistory() {
  return [
    { block: 1, type: "Đăng tài sản", id: 1, detail: "Phòng trọ Quận 1, 25m² · 1.0 ETH/kỳ · cọc 2.0 ETH" },
    { block: 2, type: "Đăng tài sản", id: 2, detail: "Căn hộ mini Quận 7 · 0.5 ETH/kỳ · cọc 1.0 ETH" },
    { block: 3, type: "Đặt cọc", id: 2, detail: `${tenant.address.slice(0, 6)}…${tenant.address.slice(-4)} cọc 1.0 ETH` },
    { block: 4, type: "Trả tiền thuê", id: 2, detail: `${tenant.address.slice(0, 6)}…${tenant.address.slice(-4)} trả 0.5 ETH` },
    { block: 5, type: "Đăng tài sản", id: 3, detail: "Nhà nguyên căn Thủ Đức · 3.0 ETH/kỳ · cọc 6.0 ETH" },
    { block: 6, type: "Đặt cọc", id: 3, detail: `${tenant.address.slice(0, 6)}…${tenant.address.slice(-4)} cọc 6.0 ETH` },
    { block: 7, type: "Xác nhận bàn giao", id: 3, detail: `${tenant.address.slice(0, 6)}…${tenant.address.slice(-4)}` },
    { block: 8, type: "Đăng tài sản", id: 4, detail: "Phòng trọ Bình Thạnh · 1.2 ETH/kỳ · cọc 2.4 ETH" },
    { block: 9, type: "Kết thúc", id: 4, detail: "hoàn 1.9 ETH · khấu trừ 0.5 ETH" },
  ];
}
