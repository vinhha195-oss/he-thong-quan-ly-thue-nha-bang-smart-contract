import { ethers } from "ethers";

export function short(addr) {
  if (!addr || addr === ethers.ZeroAddress) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function eth(wei) {
  try { return ethers.formatEther(wei) + " ETH"; } catch { return "—"; }
}
