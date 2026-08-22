import { useState } from "react";
import { resolveIpfsUrls } from "../utils/ipfs.js";

const HOUSE_ICON = (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-7 9 7" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
  </svg>
);

/** Anh lon + hang thumbnail (neu co nhieu anh), dung trong modal chi tiet phong. */
export function PropertyGallery({ property: p }) {
  const urls = resolveIpfsUrls(p.imageCID);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(() => new Set());

  const markFailed = (i) => setFailed((s) => new Set(s).add(i));
  const validIndexes = urls.map((_, i) => i).filter((i) => !failed.has(i));
  const mainIndex = validIndexes.includes(active) ? active : validIndexes[0];

  if (mainIndex === undefined) {
    return <div className="detail-image-placeholder">{HOUSE_ICON}</div>;
  }

  return (
    <div>
      <div className="detail-image">
        <img className="img-fill" src={urls[mainIndex]} alt={p.title || `Phòng #${p.id}`} onError={() => markFailed(mainIndex)} />
      </div>
      {validIndexes.length > 1 && (
        <div className="gallery-thumbs">
          {validIndexes.map((i) => (
            <button
              key={i}
              className={`gallery-thumb${i === mainIndex ? " on" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`Ảnh ${i + 1}`}
            >
              <img src={urls[i]} alt="" onError={() => markFailed(i)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
