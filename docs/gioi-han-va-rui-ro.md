# Giới hạn & phân tích rủi ro bảo mật

## 1. Giới hạn hiện tại (bản tối thiểu)

- **Chủ nhà tự quyết định mức khấu trừ cọc** — `endLease` chỉ kiểm tra
  `deductAmount <= depositHeld`, không có bên thứ ba xác minh mức khấu trừ có hợp lý
  hay không. Bước `confirmHandover` (người thuê tự xác nhận bàn giao) là biện pháp giảm
  thiểu duy nhất hiện có: chủ nhà không thể tất toán khi người thuê chưa xác nhận.
- **Không có cơ chế trọng tài khi hai bên bất đồng** về mức khấu trừ — nếu người thuê
  không đồng ý, hệ thống hiện tại không có đường xử lý on-chain, phải giải quyết ngoài
  hệ thống (thoả thuận, pháp lý truyền thống).
- **Không phạt thanh toán trễ hạn** — `payRent` không kiểm tra thời điểm, người thuê có
  thể trả trễ mà không chịu phạt gì trên contract.
- **Không giới hạn số lượng tài sản** — `getAllProperties()` lặp qua toàn bộ
  `propertyCount`; nếu số tài sản rất lớn, lời gọi `view` này có thể chậm/tốn gas đọc ở
  phía client (không ảnh hưởng đến an toàn tiền, chỉ ảnh hưởng hiệu năng đọc).
- **Chỉ hỗ trợ thanh toán bằng ETH** — không hỗ trợ stablecoin/ERC-20, không có oracle
  quy đổi giá.

## 2. Rủi ro bảo mật đã xử lý

| Rủi ro | Biện pháp đã áp dụng |
|---|---|
| **Reentrancy** khi chuyển ETH (`payRent`, `endLease`, `rentProperty`) | Modifier `nonReentrant` (OpenZeppelin `ReentrancyGuard`) + pattern checks-effects-interactions: cập nhật state trước, chuyển tiền sau. Xem chi tiết tại [thiet-ke-du-lieu.md](./thiet-ke-du-lieu.md#6-bảo-vệ-reentrancy). |
| **Chủ nhà tự thuê nhà của chính mình** để thao túng trạng thái | `require(msg.sender != p.landlord)` trong `rentProperty`. |
| **Người lạ trả tiền/xác nhận bàn giao/tất toán thay người có quyền** | Mỗi hàm đều `require(msg.sender == ...)` đúng vai trò (`tenant` hoặc `landlord`). |
| **Khấu trừ vượt quá tiền cọc đang giữ** | `require(deductAmount <= p.depositHeld)` trong `endLease`. |
| **Chuyển tiền thất bại âm thầm** | Kiểm tra giá trị trả về của `.call{value: ...}("")` bằng `require(ok, ...)` thay vì dùng `transfer()`/`send()` (tránh giới hạn 2300 gas cứng, đồng thời không bỏ sót lỗi). |

## 3. Rủi ro còn tồn tại / chưa xử lý

- **Rủi ro tập trung quyền lực (centralization risk)**: chủ nhà là bên duy nhất quyết
  định khấu trừ cọc — về bản chất vẫn là một dạng "trust the landlord", chỉ giảm bớt
  (nhờ bước xác nhận bàn giao) chứ chưa loại bỏ hoàn toàn.
- **Không có time lock / hạn chót**: người thuê có thể trì hoãn `confirmHandover` vô
  thời hạn, khiến chủ nhà không tất toán được để cho thuê lại.
- **Front-running về lý thuyết**: hai người thuê cùng gửi `rentProperty` cho cùng một
  `id` gần như đồng thời — giao dịch tới sau sẽ tự động revert (vì `status` đã đổi
  thành `Active`), không mất tiền, nhưng trải nghiệm người dùng chưa tối ưu (không có
  hàng đợi/thông báo trước).
- **Dữ liệu `title`/`location` là `string` tự do**: không kiểm duyệt nội dung, có thể bị
  dùng để chèn nội dung không phù hợp (rủi ro về mặt vận hành, không phải bảo mật tiền).
- **Không giới hạn gas cho vòng lặp** trong `getAllProperties()` nếu tập dữ liệu lớn.

## 4. Hướng phát triển

### 4.1. Cơ chế trọng tài khi có tranh chấp

Thêm vai trò `ARBITER_ROLE` (một bên thứ ba trung lập) có quyền override quyết định
khấu trừ khi người thuê phản đối, thay vì để chủ nhà toàn quyền quyết định.

### 4.2. Phạt thanh toán trễ

Ghi nhận `dueDate` cho mỗi kỳ thuê; nếu `payRent` được gọi sau `dueDate`, tự động cộng
thêm một khoản phạt (vd % trên `monthlyRent`) trước khi coi kỳ đó là đã thanh toán đủ.

### 4.3. Multisig cho giải ngân tiền cọc (thiết kế đề xuất)

OpenZeppelin 5.x không còn cung cấp sẵn một contract "multisig ký nhiều chữ ký" độc
lập — hướng được chọn để tham khảo cho vòng sau:

- Dùng **`AccessControl`** để định nghĩa vai trò `ARBITER_ROLE` với nhiều địa chỉ được
  cấp vai trò này (vd: chủ nhà + trọng tài + một bên giám sát độc lập).
- Dùng **`TimelockController`** làm nơi các đề xuất giải ngân tiền cọc tranh chấp phải
  đi qua: một địa chỉ có `PROPOSER_ROLE` đề xuất giải ngân, cần đủ số lượng địa chỉ có
  `EXECUTOR_ROLE` xác nhận và chờ qua khoảng trễ (`minDelay`) mới thực thi được — vừa
  tạo hiệu ứng "nhiều bên đồng thuận" (tương đương multisig) vừa có thời gian trễ để bên
  còn lại kịp phản ứng nếu phát hiện bất thường.
- Việc này **chưa được code** ở bản hiện tại; chỉ ghi nhận làm thiết kế tham chiếu.
