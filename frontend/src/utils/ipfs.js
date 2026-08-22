// Tien ich IPFS: chi lo 2 viec —
//   1) doi mot CID (hoac ipfs://..., hoac URL http san co) thanh URL xem duoc qua gateway.
//   2) upload 1 file len IPFS qua Pinata, CHI khi nguoi dung tu cau hinh API key rieng
//      (VITE_PINATA_JWT) — giong het cach du an nay xu ly khoa Sepolia (Hardhat keystore):
//      dich vu ben ngoai can tai khoan/khoa rieng thi de nguoi dung tu cung cap, khong
//      gia lap mot upload "mien phi khong can dang ky" (thuc te khong ton tai on dinh).
// Neu khong cau hinh, nguoi dung van dung duoc tinh nang bang cach dan CID da tu upload
// san (vd qua Pinata/NFT.Storage/web UI cua IPFS Desktop) vao form — khong bat buoc phai
// dung code upload nay.
//
// resolveIpfsUrl cung cho qua thang URL "blob:..." (anh preview cuc bo trong trinh
// duyet, tu URL.createObjectURL). PropertyForm dung no lam gia tri du phong O CHE DO
// MOCK khi chua co CID that — hop ly vi du lieu mock von chi song trong bo nho trinh
// duyet phien do (mat khi F5), khong phai du lieu that tren blockchain. O CHE DO CHAIN
// THAT, blob: se KHONG duoc dung lam imageCID gui len contract (chi nguoi dang tin
// trong chinh tab do moi xem duoc, vo nghia voi nguoi khac) — bat buoc phai co CID that.

const GATEWAY = "https://ipfs.io/ipfs/";
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || "";

export const canUploadToIpfs = Boolean(PINATA_JWT);

/** Nhan CID thuan tuy, "ipfs://<cid>", hoac URL http(s) co san -> tra ve URL xem duoc. */
export function resolveIpfsUrl(cidOrUrl) {
  if (!cidOrUrl) return null;
  const value = cidOrUrl.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) return value;
  if (value.startsWith("ipfs://")) return GATEWAY + value.slice("ipfs://".length);
  return GATEWAY + value;
}

/**
 * Property.imageCID co the chua NHIEU anh, cach nhau boi dau phay (van la 1 field
 * string duy nhat tren contract - khong can doi schema). Ham nay tach + resolve tung
 * anh thanh mang URL xem duoc.
 */
export function resolveIpfsUrls(cidList) {
  if (!cidList) return [];
  return cidList
    .split(",")
    .map((c) => resolveIpfsUrl(c))
    .filter(Boolean);
}

/** Gop mang CID (co the chua chuoi rong) thanh 1 chuoi cach nhau boi dau phay. */
export function joinCIDs(cids) {
  return cids.map((c) => c?.trim()).filter(Boolean).join(",");
}

/**
 * Upload 1 file len IPFS qua Pinata REST API. Chi dung duoc khi VITE_PINATA_JWT da
 * duoc cau hinh (bien moi truong frontend, nguoi dung tu lay JWT tu tai khoan Pinata
 * cua ho — mien phi, khong can the tin dung). Tra ve CID cua file.
 */
export async function uploadFileToIpfs(file) {
  if (!canUploadToIpfs) {
    throw new Error(
      "Chưa cấu hình VITE_PINATA_JWT — vui lòng dán CID đã upload sẵn thay vì chọn file.",
    );
  }
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload IPFS thất bại (${res.status}): ${text || res.statusText}`);
  }
  const data = await res.json();
  return data.IpfsHash;
}
