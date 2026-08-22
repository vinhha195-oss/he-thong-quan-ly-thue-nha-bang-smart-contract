import { useState } from "react";
import { resolveIpfsUrl } from "../utils/ipfs.js";

const HOUSE_ICON = (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-7 9 7" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
  </svg>
);

/** Anh phong hoac placeholder gradient, dung chung cho card va modal chi tiet. */
export function PropertyImage({ property: p, imgClass, placeholderClass }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = resolveIpfsUrl(p.imageCID);

  if (imageUrl && !imageFailed) {
    return (
      <img
        className={imgClass}
        src={imageUrl}
        alt={p.title || `Phòng #${p.id}`}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }
  return <div className={placeholderClass}>{HOUSE_ICON}</div>;
}
