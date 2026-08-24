import { useState } from "react";
import { canUploadToIpfs, joinCIDs, uploadFileToIpfs } from "../utils/ipfs.js";

const EMPTY_FORM = { title: "", location: "", rent: "", deposit: "", note: "" };
let nextImgId = 1;

const CLOSE_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

/** Kiem tra cac o bat buoc - chi bao loi tai dung o, khong xoa noi dung da nhap. */
function validateForm(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Vui lòng nhập mô tả phòng";

  const rentNormalized = (form.rent ?? "").toString().trim().replace(",", ".");
  const rentNum = parseFloat(rentNormalized);
  if (!rentNormalized) errors.rent = "Vui lòng nhập tiền thuê";
  else if (Number.isNaN(rentNum) || rentNum <= 0) errors.rent = "Tiền thuê phải là số lớn hơn 0";

  const depositNormalized = (form.deposit ?? "").toString().trim().replace(",", ".");
  if (depositNormalized) {
    const depositNum = parseFloat(depositNormalized);
    if (Number.isNaN(depositNum) || depositNum < 0) errors.deposit = "Tiền cọc không hợp lệ";
  }

  return errors;
}

export function PropertyForm({ busy, canSubmit, isMock, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [manualCids, setManualCids] = useState("");
  const [images, setImages] = useState([]); // { id, previewUrl, cid, uploading, error }

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => (errs[key] ? { ...errs, [key]: undefined } : errs));
  };

  const submit = async () => {
    const fieldErrors = validateForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    // Anh da upload IPFS thi dung CID that; anh chua upload (khong loi Pinata) thi o
    // che do mock dung tam URL preview cuc bo (chi song trong tab nay), o che do chain
    // that thi bo qua (khong the ghi 1 link blob: vo nghia vao contract that).
    const fromPicker = images.map((im) => im.cid || (isMock ? im.previewUrl : null));
    const imageCID = joinCIDs([...fromPicker, ...manualCids.split(",")]);
    const ok = await onSubmit({ ...form, imageCID });
    // Chi xoa form khi giao dich thuc su thanh cong - that bai (vd vi tu choi ky, tx
    // revert) thi giu nguyen noi dung da nhap, khong bat nguoi dung go lai tu dau.
    if (ok) {
      setForm(EMPTY_FORM);
      setManualCids("");
      setImages([]);
    }
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

  const hasUnsavedImage = images.some((im) => !im.uploading && !im.cid);

  return (
    <section className="card form">
      <h2>Đăng tài sản cho thuê</h2>
      <p className="hint">Bạn đóng vai chủ nhà. Thông tin sẽ được ghi công khai lên blockchain.</p>
      <label>
        Mô tả phòng
        <input
          value={form.title}
          onChange={set("title")}
          placeholder="Phòng trọ Quận 1, 25m²"
          className={errors.title ? "field-error" : ""}
        />
        {errors.title && <span className="field-error-msg">{errors.title}</span>}
      </label>
      <label>
        Địa chỉ / khu vực
        <input value={form.location} onChange={set("location")} placeholder="TP. Hồ Chí Minh" />
      </label>
      <div className="row">
        <label>
          Tiền thuê mỗi kỳ (ETH)
          <input
            value={form.rent}
            onChange={set("rent")}
            placeholder="1"
            className={errors.rent ? "field-error" : ""}
          />
          {errors.rent && <span className="field-error-msg">{errors.rent}</span>}
        </label>
        <label>
          Tiền cọc (ETH)
          <input
            value={form.deposit}
            onChange={set("deposit")}
            placeholder="2"
            className={errors.deposit ? "field-error" : ""}
          />
          {errors.deposit && <span className="field-error-msg">{errors.deposit}</span>}
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
              {!im.uploading && !im.cid && (
                <span className={`image-status ${isMock ? "" : "warn"}`}>{isMock ? "Chỉ trong phiên này" : "Chưa lưu IPFS"}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {hasUnsavedImage && (
        <p className="hint" style={{ marginTop: -8 }}>
          {isMock ? (
            <>Ở <b>chế độ dữ liệu mẫu</b>, ảnh chưa lưu IPFS vẫn hiển thị bình thường trong danh sách — nhưng chỉ trong
            trình duyệt này và mất khi tải lại trang. Muốn lưu ảnh thật lên IPFS: cấu hình <code>VITE_PINATA_JWT</code> hoặc
            dán CID đã upload sẵn ở ô bên dưới.</>
          ) : (
            <>Một số ảnh <b>chưa lưu lên IPFS</b> nên sẽ <b>không</b> được đính kèm khi đăng lên blockchain thật (chưa
            cấu hình <code>VITE_PINATA_JWT</code>) — dán CID đã upload sẵn ở ô bên dưới nếu muốn ảnh đó lưu thật.</>
          )}
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
