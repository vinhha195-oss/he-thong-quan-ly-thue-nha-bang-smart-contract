import { avatarGradient } from "../utils/avatar.js";

/** Avatar tron sinh tu dia chi vi. Khong render gi neu dia chi rong/zero-address. */
export function Avatar({ address, size = 22 }) {
  const gradient = avatarGradient(address);
  if (!gradient) return null;
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: gradient }}
      aria-hidden="true"
    />
  );
}
