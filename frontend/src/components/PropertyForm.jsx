import { useState } from "react";
import { canUploadToIpfs, uploadFileToIpfs } from "../utils/ipfs.js";

const EMPTY_FORM = { title: "", location: "", rent: "", deposit: "", imageCID: "", note: "" };

export function PropertyForm({ busy, canSubmit, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewSaved, setPreviewSaved] = useState(true);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    await onSubmit(form);
    setForm(EMPTY_FORM);
    setPreviewUrl(null);
    setPreviewSaved(true);
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));

    if (!canUploadToIpfs) {
      setPreviewSaved(false);
      setForm((f) => ({ ...f, imageCID: "" }));
      return;
    }

    setUploading(true);
    try {
      const cid = await uploadFileToIpfs(file);
      setForm((f) => ({ ...f, imageCID: cid }));
      setPreviewSaved(true);
    } catch (err) {
      window.alert(err.message);
      setPreviewSaved(false);
    } finally {
      setUploading(false);
    }
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
        Ảnh phòng
        <input type="file" accept="image/*" onChange={handleFilePick} disabled={uploading} />
      </label>
      {previewUrl && (
        <div className="image-preview">
          <img src={previewUrl} alt="Xem trước" />
          {uploading && <span className="preview-status">Đang tải lên IPFS…</span>}
          {!uploading && previewSaved && form.imageCID && <span className="preview-status ok">Đã lưu lên IPFS: {form.imageCID.slice(0, 14)}…</span>}
          {!uploading && !previewSaved && (
            <span className="preview-status warn">
              Chỉ xem trước tại đây, <b>chưa lưu lên IPFS</b> (chưa cấu hình <code>VITE_PINATA_JWT</code>) — dán CID
              đã upload sẵn ở ô bên dưới nếu muốn ảnh này lưu thật.
            </span>
          )}
        </div>
      )}
      <label>
        Hoặc dán CID/URL đã upload sẵn lên IPFS (không bắt buộc)
        <input
          value={form.imageCID}
          onChange={set("imageCID")}
          placeholder="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
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

      <button className="primary" disabled={busy || uploading || !canSubmit} onClick={submit}>Đăng tài sản</button>
    </section>
  );
}
