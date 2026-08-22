import { ethers } from "ethers";

// Avatar dang "gradient blob" sinh tat dinh tu dia chi vi (giong Rainbow/Uniswap) —
// khong goi API ngoai, khong phu thuoc thu vien blockies/jazzicon. Dia chi da la chuoi
// hex ngau nhien san nen chi can cat truc tiep tung doan lam seed mau, khong can ham
// hash rieng. Cung 1 dia chi luon ra cung 1 avatar; 2 dia chi khac nhau ra mau khac han
// nhau ro ret — giup nguoi dung nhan dien nhanh bang mat, dung nhu muc dich cua identicon.
export function avatarGradient(address) {
  if (!address || address === ethers.ZeroAddress) return null;
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0");
  const h1 = parseInt(hex.slice(0, 4), 16) % 360;
  const h2 = parseInt(hex.slice(4, 8), 16) % 360;
  const h3 = parseInt(hex.slice(8, 12), 16) % 360;
  const angle = parseInt(hex.slice(12, 15), 16) % 360;
  return `conic-gradient(from ${angle}deg, hsl(${h1} 72% 62%), hsl(${h2} 72% 56%), hsl(${h3} 72% 62%), hsl(${h1} 72% 62%))`;
}
