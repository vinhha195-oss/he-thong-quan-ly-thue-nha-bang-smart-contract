import { useState } from "react";
import { canUploadToIpfs, uploadFileToIpfs } from "../utils/ipfs.js";

const EMPTY_FORM = { title: "", location: "", rent: "", deposit: "", imageCID: "" };

export function PropertyForm({ busy, canSubmit, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    await onSubmit(form);
    setForm(EMPTY_FORM);
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const cid = await uploadFileToIpfs(file);
      setForm((f) => ({ ...f, imageCID: cid }));
    } catch (err) {
      window.alert(err.message);
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
        Ảnh phòng trên IPFS — dán CID/URL đã upload sẵn (không bắt buộc)
        <input
          value={form.imageCID}
          onChange={set("imageCID")}
          placeholder="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
        />
      </label>
      {canUploadToIpfs ? (
        <label className="hint">
          Hoặc tải ảnh lên IPFS trực tiếp (qua Pinata):{" "}
          <input type="file" accept="image/*" onChange={handleFilePick} disabled={uploading} />
          {uploading && " Đang tải lên…"}
        </label>
      ) : (
        <p className="hint">
          Muốn tải ảnh trực tiếp từ đây: cấu hình <code>VITE_PINATA_JWT</code> trong{" "}
          <code>frontend/.env</code> (JWT lấy miễn phí từ tài khoản Pinata của bạn). Nếu
          chưa có, cứ dán CID đã upload thủ công ở ô trên.
        </p>
      )}
      <button className="primary" disabled={busy || uploading || !canSubmit} onClick={submit}>Đăng tài sản</button>
    </section>
  );
}
