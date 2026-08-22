import { ethers } from "ethers";

export function short(addr) {
  if (!addr || addr === ethers.ZeroAddress) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function eth(wei) {
  try { return ethers.formatEther(wei) + " ETH"; } catch { return "—"; }
}

export function dateTime(unixSeconds) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
