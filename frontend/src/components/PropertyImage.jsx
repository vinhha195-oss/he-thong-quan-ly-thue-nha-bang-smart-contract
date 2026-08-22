import { useState } from "react";
import { resolveIpfsUrls } from "../utils/ipfs.js";

const HOUSE_ICON = (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-7 9 7" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
  </svg>
);

/**
 * Anh dau tien cua phong (dung cho card/cover) hoac placeholder gradient neu khong co
 * anh nao. imgClass/placeholderClass quyet dinh kich thuoc/vi tri (bleed ra vien card
 * hay modal) — ap dung cho div bao ngoai, <img> ben trong luon fill 100%.
 */
export function PropertyImage({ property: p, imgClass, placeholderClass, badge }) {
  const [imageFailed, setImageFailed] = useState(false);
  const urls = resolveIpfsUrls(p.imageCID);
  const cover = urls[0];

  if (cover && !imageFailed) {
    return (
      <div className={imgClass}>
        <img
          className="img-fill"
          src={cover}
          alt={p.title || `Phòng #${p.id}`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
        {badge && urls.length > 1 && <span className="image-count-badge">+{urls.length - 1} ảnh</span>}
      </div>
    );
  }
  return <div className={placeholderClass}>{HOUSE_ICON}</div>;
}
