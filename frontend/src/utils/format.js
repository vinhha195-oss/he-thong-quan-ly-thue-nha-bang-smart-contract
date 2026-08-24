import { ethers } from "ethers";

export function short(addr) {
  if (!addr || addr === ethers.ZeroAddress) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function eth(wei) {
  try { return ethers.formatEther(wei) + " ETH"; } catch { return "—"; }
}

/**
 * Nhu ethers.parseEther() nhung chap nhan ca dau phay lam dau thap phan (vd "0,01",
 * kieu Viet Nam) lan dau cham ("0.01") - nguoi dung go tay hay quen bam dau nao cung
 * dung duoc, tranh loi parse khi thuc ra ho chi nham dau thap phan.
 */
export function parseEth(value) {
  const normalized = (value ?? "").toString().trim().replace(",", ".");
  return ethers.parseEther(normalized || "0");
}

export function dateTime(unixSeconds) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
