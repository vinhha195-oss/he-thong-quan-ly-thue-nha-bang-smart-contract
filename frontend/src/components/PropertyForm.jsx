import { useState } from "react";
import { canUploadToIpfs, joinCIDs, uploadFileToIpfs } from "../utils/ipfs.js";

const EMPTY_FORM = { title: "", location: "", rent: "", deposit: "", note: "" };
let nextImgId = 1;

const CLOSE_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export function PropertyForm({ busy, canSubmit, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [manualCids, setManualCids] = useState("");
  const [images, setImages] = useState([]); // { id, previewUrl, cid, uploading, error }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    const uploaded = images.filter((im) => im.cid).map((im) => im.cid);
    const imageCID = joinCIDs([...uploaded, ...manualCids.split(",")]);
    await onSubmit({ ...form, imageCID });
    setForm(EMPTY_FORM);
    setManualCids("");
    setImages([]);
  };

  const removeImage = (id) => setImages((imgs) => imgs.filter((im) => im.id !== id));

  const handleFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const entries = files.map((file) => ({
      id: nextImgId++,
      previewUrl: URL.createObjectURL(file),
      cid: null,
      uploading: canUploadToIpfs,
      error: !canUploadToIpfs,
    }));
    setImages((imgs) => [...imgs, ...entries]);

    if (!canUploadToIpfs) return;

    entries.forEach((entry, i) => {
      uploadFileToIpfs(files[i])
        .then((cid) => {
          setImages((imgs) => imgs.map((im) => (im.id === entry.id ? { ...im, cid, uploading: false } : im)));
        })
        .catch(() => {
          setImages((imgs) => imgs.map((im) => (im.id === entry.id ? { ...im, uploading: false, error: true } : im)));
        });
    });
  };

  return (
    <section className="card form">
      <h2>Đăng tài sản cho thuê</h2>
      <p className="hint">Bạn đóng vai chủ nhà. Thông tin sẽ được ghi công khai lên blockchain.</p>
      <label>
        Mô tả phòng
        <input value={form.title} onChange={set("title")} placeholder="Phòng trọ Quận 1, 25m²" />
      </label>
      <label>
        Địa chỉ / khu vực
        <input value={form.location} onChange={set("location")} placeholder="TP. Hồ Chí Minh" />
      </label>
      <div className="row">
        <label>
          Tiền thuê mỗi kỳ (ETH)
          <input value={form.rent} onChange={set("rent")} placeholder="1" />
        </label>
        <label>
          Tiền cọc (ETH)
          <input value={form.deposit} onChange={set("deposit")} placeholder="2" />
        </label>
      </div>

      <label>
        Ảnh phòng (chọn được nhiều ảnh)
        <input type="file" accept="image/*" multiple onChange={handleFilePick} />
      </label>
      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((im) => (
            <div key={im.id} className="image-preview-item">
              <img src={im.previewUrl} alt="Xem trước" />
              <button type="button" className="image-remove" onClick={() => removeImage(im.id)} aria-label="Bỏ ảnh này">{CLOSE_ICON}</button>
              {im.uploading && <span className="image-status uploading">Đang tải…</span>}
              {!im.uploading && im.cid && <span className="image-status ok">Đã lưu IPFS</span>}
              {!im.uploading && im.error && <span className="image-status warn">Chỉ xem trước</span>}
            </div>
          ))}
        </div>
      )}
      {images.some((im) => im.error) && (
        <p className="hint" style={{ marginTop: -8 }}>
          Một số ảnh chỉ xem trước, <b>chưa lưu lên IPFS</b> (chưa cấu hình <code>VITE_PINATA_JWT</code>) — dán CID
          đã upload sẵn ở ô bên dưới nếu muốn ảnh lưu thật, hoặc bỏ qua để đăng tin không kèm ảnh đó.
        </p>
      )}

      <label>
        Hoặc dán CID/URL đã upload sẵn lên IPFS — cách nhau bằng dấu phẩy nếu nhiều ảnh (không bắt buộc)
        <input
          value={manualCids}
          onChange={(e) => setManualCids(e.target.value)}
          placeholder="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi, bafybeibwzifw3n67xheqzk3wshhy6cp423rf6oxjmelzcrhb2dujjxpuq"
        />
      </label>

      <label>
        Ghi chú thêm (nội quy, lưu ý…) — không bắt buộc
        <textarea
          value={form.note}
          onChange={set("note")}
          placeholder="Vd: không nuôi thú cưng, giờ giấc tự do, có chỗ để xe…"
          rows={3}
        />
      </label>

      <button className="primary" disabled={busy || images.some((im) => im.uploading) || !canSubmit} onClick={submit}>Đăng tài sản</button>
    </section>
  );
}
