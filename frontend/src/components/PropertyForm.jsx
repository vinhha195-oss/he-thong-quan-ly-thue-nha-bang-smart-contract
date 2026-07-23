import { useState } from "react";

const EMPTY_FORM = { title: "", location: "", rent: "", deposit: "" };

export function PropertyForm({ busy, canSubmit, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    await onSubmit(form);
    setForm(EMPTY_FORM);
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
      <button className="primary" disabled={busy || !canSubmit} onClick={submit}>Đăng tài sản</button>
    </section>
  );
}
