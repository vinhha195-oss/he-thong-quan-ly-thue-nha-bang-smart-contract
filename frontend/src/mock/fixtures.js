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

// Vai CID mau tren IPFS (public gateway anh test) de minh hoa card co anh vs khong anh.
const SAMPLE_IMAGES = [
  "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "bafybeibwzifw3n67xheqzk3wshhy6cp423rf6oxjmelzcrhb2dujjxpuq",
];

// 20 phong mau, du trang thai (Listed/Active/HandedOver/Ended), du khu vuc — de test
// duoc tim kiem, phan trang, xem chi tiet ma khong can dang tay tung mon.
const TEMPLATES = [
  { title: "Phòng trọ Quận 1, 25m²", location: "TP. Hồ Chí Minh", rent: "1", deposit: "2", note: "Không nuôi thú cưng, giờ giấc tự do.", image: 0 },
  { title: "Căn hộ mini Quận 7", location: "TP. Hồ Chí Minh", rent: "0.5", deposit: "1", note: "", image: null },
  { title: "Nhà nguyên căn Thủ Đức", location: "TP. Hồ Chí Minh", rent: "3", deposit: "6", note: "Có chỗ để xe hơi.", image: 1 },
  { title: "Phòng trọ Bình Thạnh", location: "TP. Hồ Chí Minh", rent: "1.2", deposit: "2.4", note: "", image: null },
  { title: "Studio Quận 3, ban công", location: "TP. Hồ Chí Minh", rent: "2", deposit: "4", note: "Gần chợ, tiện đi lại.", image: 0 },
  { title: "Phòng trọ Gò Vấp", location: "TP. Hồ Chí Minh", rent: "0.9", deposit: "1.8", note: "", image: null },
  { title: "Căn hộ 2PN Tân Bình", location: "TP. Hồ Chí Minh", rent: "4", deposit: "8", note: "Có thang máy, bảo vệ 24/7.", image: 1 },
  { title: "Phòng trọ Phú Nhuận", location: "TP. Hồ Chí Minh", rent: "1.5", deposit: "3", note: "", image: null },
  { title: "Nhà trọ Cầu Giấy", location: "Hà Nội", rent: "1.3", deposit: "2.6", note: "Khu yên tĩnh, an ninh tốt.", image: 0 },
  { title: "Chung cư mini Đống Đa", location: "Hà Nội", rent: "1.8", deposit: "3.6", note: "", image: null },
  { title: "Phòng trọ Hai Bà Trưng", location: "Hà Nội", rent: "1.1", deposit: "2.2", note: "Chủ nhà thân thiện.", image: null },
  { title: "Căn hộ Hải Châu view sông", location: "Đà Nẵng", rent: "2.5", deposit: "5", note: "", image: 1 },
  { title: "Phòng trọ Sơn Trà gần biển", location: "Đà Nẵng", rent: "1.4", deposit: "2.8", note: "Đi bộ 5 phút ra biển.", image: 0 },
  { title: "Homestay nhỏ Đà Lạt", location: "Lâm Đồng", rent: "2.2", deposit: "4.4", note: "Có sân vườn, view đồi thông.", image: 1 },
  { title: "Phòng trọ Vũng Tàu", location: "Bà Rịa - Vũng Tàu", rent: "1", deposit: "2", note: "", image: null },
  {
    title: "Căn hộ Ninh Kiều", location: "Cần Thơ", rent: "1.6", deposit: "3.2", note: "",
    image: null, status: 1, rentPaidCount: 2,
  },
  {
    title: "Phòng trọ Quận 5, gần ĐH", location: "TP. Hồ Chí Minh", rent: "1.1", deposit: "2.2", note: "Ưu tiên sinh viên.",
    image: 0, status: 1, rentPaidCount: 1,
  },
  {
    title: "Căn hộ Quận 10", location: "TP. Hồ Chí Minh", rent: "2.8", deposit: "5.6", note: "",
    image: 1, status: 2, rentPaidCount: 3,
  },
  {
    title: "Nhà nguyên căn Biên Hòa", location: "Đồng Nai", rent: "3.5", deposit: "7", note: "Sân rộng, để được ô tô.",
    image: null, status: 2, rentPaidCount: 2,
  },
  {
    title: "Phòng trọ Thủ Dầu Một", location: "Bình Dương", rent: "0.8", deposit: "1.6", note: "",
    image: null, status: 3, rentPaidCount: 4,
  },
];

export function createInitialProperties() {
  return TEMPLATES.map((t, i) => {
    const id = i + 1;
    const status = t.status ?? 0;
    const monthlyRent = eth(t.rent);
    const deposit = eth(t.deposit);
    const isRented = status >= 1;
    return {
      id,
      landlord: landlord.address,
      title: t.title,
      location: t.location,
      monthlyRent,
      deposit,
      status,
      tenant: isRented ? tenant.address : ethers.ZeroAddress,
      depositHeld: status === 3 ? 0n : isRented ? deposit : 0n,
      rentPaidCount: t.rentPaidCount ?? 0,
      imageCID: t.image === null || t.image === undefined ? "" : SAMPLE_IMAGES[t.image],
      note: t.note,
    };
  });
}

export function createInitialHistory() {
  const events = [];
  let block = 1;
  TEMPLATES.forEach((t, i) => {
    const id = i + 1;
    const monthlyRent = eth(t.rent);
    const deposit = eth(t.deposit);
    events.push({
      block: block++, type: "Đăng tài sản", id, from: landlord.address, to: null, amount: null,
      detail: `${t.title} · ${t.rent} ETH/kỳ · cọc ${t.deposit} ETH`,
      extra: { title: t.title, monthlyRent, deposit },
    });
    if ((t.status ?? 0) >= 1) {
      events.push({
        block: block++, type: "Đặt cọc", id, from: tenant.address, to: landlord.address, amount: deposit,
        detail: `${tenant.address.slice(0, 6)}…${tenant.address.slice(-4)} cọc ${t.deposit} ETH`, extra: {},
      });
      for (let k = 0; k < (t.rentPaidCount ?? 0); k++) {
        events.push({
          block: block++, type: "Trả tiền thuê", id, from: tenant.address, to: landlord.address, amount: monthlyRent,
          detail: `${tenant.address.slice(0, 6)}…${tenant.address.slice(-4)} trả ${t.rent} ETH`, extra: {},
        });
      }
    }
    if ((t.status ?? 0) >= 2) {
      events.push({
        block: block++, type: "Xác nhận bàn giao", id, from: tenant.address, to: landlord.address, amount: null,
        detail: `${tenant.address.slice(0, 6)}…${tenant.address.slice(-4)}`, extra: {},
      });
    }
    if ((t.status ?? 0) >= 3) {
      const deduct = eth("0.5");
      const refund = deposit - deduct;
      events.push({
        block: block++, type: "Kết thúc", id, from: landlord.address, to: tenant.address, amount: refund,
        detail: `hoàn ${ethers.formatEther(refund)} ETH · khấu trừ 0.5 ETH`,
        extra: { refundToTenant: refund, deductToLandlord: deduct },
      });
    }
  });
  const now = Math.floor(Date.now() / 1000);
  return events.map((e, i) => ({
    txHash: "0x" + (i + 1).toString(16).padStart(64, "0"),
    timestamp: now - (events.length - i) * 3600,
    ...e,
  }));
}
