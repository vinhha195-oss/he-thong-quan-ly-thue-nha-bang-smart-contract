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
- **Bằng chứng sở hữu hợp đồng bằng token**: mỗi lượt thuê thành công được đại diện bằng
  một token ERC-721 không chuyển nhượng (`RentalAgreementToken`), mint thẳng cho người
  thuê ngay khi đặt cọc — tách biệt "ai đang giữ quyền của hợp đồng thuê nào" (token) ra
  khỏi "luật nghiệp vụ thuê nhà" (`RentalManager`), đúng mô hình token/manager theo quy
  trình chuẩn. Lý do chọn ERC-721 (thay vì ERC-20/1155) và thiết kế `tokenId ==
  propertyId`: xem [lua-chon-token.md](./lua-chon-token.md).
- **Tra cứu nhanh không phụ thuộc trực tiếp vào node**: một backend indexer nghe event
  từ contract, ghi lại vào SQLite, expose REST API — blockchain vẫn là nguồn dữ liệu có
  thẩm quyền, backend chỉ là lớp chỉ mục giúp tra cứu nhanh hơn gọi lại `eth_call` mỗi
  lần. Chi tiết: [backend/README.md](../backend/README.md).

## 3. Đối tượng người dùng (actor)

| Actor | Vai trò |
|---|---|
| **Chủ nhà (Landlord)** | Đăng tài sản cho thuê, nhận tiền thuê định kỳ, quyết định khấu trừ cọc khi kết thúc hợp đồng. |
| **Người thuê (Tenant)** | Đặt cọc để kích hoạt hợp đồng, trả tiền thuê định kỳ, xác nhận bàn giao khi trả phòng. |
| *(Người xem công khai)* | Bất kỳ ai cũng đọc được lịch sử giao dịch trên blockchain (tính minh bạch), nhưng không có quyền ghi. |

## 4. Phạm vi chức năng đã triển khai

### 4.1. Nghiệp vụ thuê nhà (mức tối thiểu)

- [x] Chủ nhà đăng thông tin tài sản (`listProperty`)
- [x] Người thuê đặt cọc (`rentProperty`) — đồng thời **tạo hợp đồng thuê** (kích hoạt
      trạng thái `Active`, không có bước "tạo hợp đồng" tách riêng vì đặt cọc chính là
      hành động xác nhận hợp đồng bắt đầu) **và mint token đại diện hợp đồng** cho
      người thuê trong cùng giao dịch
- [x] Thanh toán tiền thuê định kỳ (`payRent`)
- [x] Xác nhận bàn giao (`confirmHandover`)
- [x] Hoàn hoặc khấu trừ tiền đặt cọc + kết thúc hợp đồng (`endLease`, gộp chung vì
      khấu trừ luôn xảy ra tại thời điểm kết thúc)
- [x] Theo dõi lịch sử thanh toán (đọc trực tiếp từ event trên blockchain, tab "Lịch sử")

### 4.2. Token & tách kiến trúc (Bước 0–2 của quy trình)

- [x] Tách riêng **token contract** (`RentalAgreementToken`, ERC-721 không chuyển
      nhượng, `AccessControl` với `MINTER_ROLE`) khỏi **business contract**
      (`RentalManager`, không dùng `AccessControl` — thị trường không cần cấp phép)
- [x] Ignition module deploy đúng thứ tự: token → manager → cấp `MINTER_ROLE` cho manager

### 4.3. Toolchain (bám theo tài liệu mẫu)

- [x] Hardhat 3 + TypeScript (ESM), Hardhat Ignition thay cho script deploy thủ công,
      Hardhat keystore thay cho `.env` khi deploy Sepolia

### 4.4. Backend & bảo mật (Bước 4)

- [x] Backend event indexer + REST API (SQLite qua `node:sqlite`, xem
      [backend/README.md](../backend/README.md))
- [x] Rà soát bảo mật (Slither + rà soát thủ công thay thế khi Slither không chạy được
      trên Hardhat 3, xem [bao-mat-slither.md](./bao-mat-slither.md)), test bảo mật
      (chặn `safeTransferFrom`, chặn reentrancy qua `onERC721Received`)
- [x] Checklist production ghi rõ hạng mục còn thiếu, không tick giả — xem
      [production-checklist.md](./production-checklist.md)

## 5. Phạm vi chưa triển khai (chức năng nâng cao — hướng phát triển)

Ba chức năng nâng cao theo đề bài — **cơ chế trọng tài khi tranh chấp**, **phạt thanh
toán trễ**, **multisig cho giải ngân tiền cọc** — **chưa** được code ở phiên bản này để
tập trung hoàn thiện kiến trúc tách UI/BE và bám sát quy trình token trước. Xem hướng
thiết kế đề xuất (đặc biệt là multisig dùng OpenZeppelin `AccessControl` +
`TimelockController`) tại
[gioi-han-va-rui-ro.md](./gioi-han-va-rui-ro.md#hướng-phát-triển). Các hạng mục còn
thiếu khác cho production thật (Foundry fuzz test, audit độc lập, `Pausable`, multisig
admin, PostgreSQL) được liệt kê đầy đủ tại
[production-checklist.md](./production-checklist.md).
