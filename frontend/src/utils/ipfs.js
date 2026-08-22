// Tien ich IPFS: chi lo 2 viec —
//   1) doi mot CID (hoac ipfs://..., hoac URL http san co) thanh URL xem duoc qua gateway.
//   2) upload 1 file len IPFS qua Pinata, CHI khi nguoi dung tu cau hinh API key rieng
//      (VITE_PINATA_JWT) — giong het cach du an nay xu ly khoa Sepolia (Hardhat keystore):
//      dich vu ben ngoai can tai khoan/khoa rieng thi de nguoi dung tu cung cap, khong
//      gia lap mot upload "mien phi khong can dang ky" (thuc te khong ton tai on dinh).
// Neu khong cau hinh, nguoi dung van dung duoc tinh nang bang cach dan CID da tu upload
// san (vd qua Pinata/NFT.Storage/web UI cua IPFS Desktop) vao form — khong bat buoc phai
// dung code upload nay.

const GATEWAY = "https://ipfs.io/ipfs/";
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || "";

export const canUploadToIpfs = Boolean(PINATA_JWT);

/** Nhan CID thuan tuy, "ipfs://<cid>", hoac URL http(s) co san -> tra ve URL xem duoc. */
export function resolveIpfsUrl(cidOrUrl) {
  if (!cidOrUrl) return null;
  const value = cidOrUrl.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("ipfs://")) return GATEWAY + value.slice("ipfs://".length);
  return GATEWAY + value;
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
