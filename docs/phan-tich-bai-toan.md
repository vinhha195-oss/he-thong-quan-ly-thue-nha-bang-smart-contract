# Phân tích bài toán

## 1. Bài toán

Quy trình thuê nhà truyền thống (giấy tờ, tiền mặt/chuyển khoản ngân hàng) có ba điểm
yếu chính:

1. **Tiền cọc thiếu minh bạch** — chủ nhà giữ tiền cọc, người thuê phải tin tưởng chủ
   nhà sẽ hoàn cọc đúng hạn/đúng số tiền khi kết thúc hợp đồng.
2. **Không có bằng chứng khách quan** — việc "đã trả tiền thuê kỳ này chưa", "đã bàn
   giao phòng chưa" thường chỉ dựa vào lời nói hoặc tin nhắn, khó tra cứu lại khi có
   tranh chấp.
3. **Xử lý thủ công, tốn thời gian** — chủ nhà phải tự theo dõi từng người thuê, từng
   kỳ thanh toán, tự tính toán khấu trừ cọc.

## 2. Giải pháp

Đưa 3 nghiệp vụ lõi lên smart contract để một bên trung gian **không thể thiên vị**
(chính là đoạn mã đã triển khai, không ai sửa được) đảm nhiệm:

- **Giữ tiền cọc khách quan**: tiền cọc do smart contract giữ (không vào ví chủ nhà
  ngay), chỉ giải ngân theo đúng luật đã lập trình sẵn.
- **Ghi nhận giao dịch không thể chỉnh sửa**: mọi lần đặt cọc, trả tiền, bàn giao, tất
  toán đều là các *event* trên blockchain — tra cứu lại được vĩnh viễn, không ai xoá/sửa.
- **Tự động hoá luật hợp đồng**: các điều kiện (chỉ người thuê mới được trả tiền, không
  được khấu trừ vượt quá cọc, chủ nhà không thể tự thuê nhà mình...) được smart contract
  tự kiểm tra và từ chối giao dịch sai ngay lập tức, không cần trọng tài con người.

## 3. Đối tượng người dùng (actor)

| Actor | Vai trò |
|---|---|
| **Chủ nhà (Landlord)** | Đăng tài sản cho thuê, nhận tiền thuê định kỳ, quyết định khấu trừ cọc khi kết thúc hợp đồng. |
| **Người thuê (Tenant)** | Đặt cọc để kích hoạt hợp đồng, trả tiền thuê định kỳ, xác nhận bàn giao khi trả phòng. |
| *(Người xem công khai)* | Bất kỳ ai cũng đọc được lịch sử giao dịch trên blockchain (tính minh bạch), nhưng không có quyền ghi. |

## 4. Phạm vi chức năng đã triển khai (mức tối thiểu)

- [x] Chủ nhà đăng thông tin tài sản (`listProperty`)
- [x] Người thuê đặt cọc (`rentProperty`) — đồng thời **tạo hợp đồng thuê** (kích hoạt
      trạng thái `Active`, không có bước "tạo hợp đồng" tách riêng vì đặt cọc chính là
      hành động xác nhận hợp đồng bắt đầu)
- [x] Thanh toán tiền thuê định kỳ (`payRent`)
- [x] Xác nhận bàn giao (`confirmHandover`)
- [x] Hoàn hoặc khấu trừ tiền đặt cọc + kết thúc hợp đồng (`endLease`, gộp chung vì
      khấu trừ luôn xảy ra tại thời điểm kết thúc)
- [x] Theo dõi lịch sử thanh toán (đọc trực tiếp từ event trên blockchain, tab "Lịch sử")

## 5. Phạm vi chưa triển khai (chức năng nâng cao — hướng phát triển)

Ba chức năng nâng cao theo đề bài — **cơ chế trọng tài khi tranh chấp**, **phạt thanh
toán trễ**, **multisig cho giải ngân tiền cọc** — **chưa** được code ở phiên bản này để
tập trung hoàn thiện kiến trúc tách UI/BE trước. Xem hướng thiết kế đề xuất (đặc biệt là
multisig dùng OpenZeppelin `AccessControl` + `TimelockController`) tại
[gioi-han-va-rui-ro.md](./gioi-han-va-rui-ro.md#hướng-phát-triển).
