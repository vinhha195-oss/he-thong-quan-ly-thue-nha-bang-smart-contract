# Thiết kế dữ liệu / cấu trúc smart contract

Nguồn: [`contracts/RentalManager.sol`](../contracts/RentalManager.sol).

## 1. Enum `Status` — vòng đời một tài sản/hợp đồng

| Giá trị | Tên | Ý nghĩa |
|---|---|---|
| 0 | `Listed` | Chủ nhà đã đăng, chưa có người thuê. |
| 1 | `Active` | Người thuê đã đặt cọc, hợp đồng đang hoạt động. |
| 2 | `HandedOver` | Người thuê đã xác nhận bàn giao (trả phòng), chờ chủ nhà tất toán. |
| 3 | `Ended` | Đã tất toán cọc, hợp đồng kết thúc. |

Chuyển trạng thái là **một chiều**: `Listed → Active → HandedOver → Ended`, không có
đường lùi — mỗi hàm public chỉ cho phép gọi khi contract đang ở đúng trạng thái liền
trước (kiểm tra bằng `require`).

## 2. Struct `Property`

| Trường | Kiểu | Mô tả |
|---|---|---|
| `landlord` | `address` | Chủ nhà, gán khi `listProperty`, không đổi. |
| `title` | `string` | Mô tả tài sản (vd "Phòng trọ Quận 1, 25m²"). |
| `location` | `string` | Vị trí/khu vực. |
| `monthlyRent` | `uint256` | Tiền thuê mỗi kỳ, đơn vị wei. |
| `deposit` | `uint256` | Tiền cọc yêu cầu, đơn vị wei. |
| `status` | `Status` | Trạng thái hiện tại. |
| `tenant` | `address` | Người thuê hiện tại, `address(0)` khi chưa có ai thuê. |
| `depositHeld` | `uint256` | Số tiền cọc **đang thực sự nằm trong contract** (giảm về 0 sau `endLease`). |
| `startedAt` | `uint256` | Thời điểm `rentProperty` thành công (block timestamp). |
| `rentPaidCount` | `uint256` | Số kỳ đã trả tiền thuê thành công. |

`propertyCount` (uint256) và `mapping(uint256 => Property) properties` lưu toàn bộ
tài sản, id bắt đầu từ 1.

## 3. Event (nguồn cho tab "Lịch sử")

| Event | Khi nào emit | Tham số |
|---|---|---|
| `PropertyListed` | `listProperty` thành công | `id, landlord, title, monthlyRent, deposit` |
| `Rented` | `rentProperty` thành công | `id, tenant, depositPaid, startedAt` |
| `RentPaid` | `payRent` thành công | `id, tenant, amount, paidAt` |
| `HandoverConfirmed` | `confirmHandover` thành công | `id, tenant, confirmedAt` |
| `LeaseEnded` | `endLease` thành công | `id, refundToTenant, deductToLandlord, endedAt` |

Frontend (`ChainRentalService.loadHistory()`) gọi `contract.queryFilter()` cho cả 5
event này rồi gộp + sắp xếp theo `blockNumber` giảm dần — đây là cách "theo dõi lịch sử
thanh toán" mà không cần một database off-chain riêng.

## 4. Hàm public và điều kiện (`require`)

| Hàm | Ai gọi được | Điều kiện chặn | Hiệu ứng tiền |
|---|---|---|---|
| `listProperty(title, location, monthlyRent, deposit)` | Bất kỳ ai (trở thành chủ nhà) | `monthlyRent > 0` | Không chuyển tiền. |
| `rentProperty(id)` payable | Bất kỳ ai trừ chủ nhà | tài sản tồn tại; đang `Listed`; `msg.sender != landlord`; `msg.value == deposit` | ETH gửi kèm **ở lại trong contract** (`depositHeld`). |
| `payRent(id)` payable | Đúng `tenant` | đang `Active`; `msg.sender == tenant`; `msg.value == monthlyRent` | ETH **chuyển thẳng** cho `landlord` qua `call{value:}`. |
| `confirmHandover(id)` | Đúng `tenant` | đang `Active`; `msg.sender == tenant` | Không chuyển tiền. |
| `endLease(id, deductAmount)` | Đúng `landlord` | đang `HandedOver`; `msg.sender == landlord`; `deductAmount <= depositHeld` | Chuyển `deductAmount` cho `landlord`, phần còn lại (`depositHeld - deductAmount`) hoàn cho `tenant`. |
| `getProperty(id)` / `getAllProperties()` | Bất kỳ ai (view) | — | — |

## 5. Vì sao tiền cọc giữ ở contract còn tiền thuê chuyển thẳng?

- **Tiền cọc** cần một bên trung gian khách quan giữ cho đến khi có xác nhận bàn giao —
  đây chính là điểm khác biệt so với thuê nhà truyền thống (chủ nhà giữ cọc, người thuê
  phải tin tưởng). Contract đóng vai trò "ký quỹ" (escrow).
- **Tiền thuê định kỳ** không có tranh chấp về việc "ai giữ" — trả xong là xong nghĩa vụ
  kỳ đó, nên chuyển thẳng cho chủ nhà ngay khi `payRent` thành công, giảm số dư đọng
  trong contract (giảm bề mặt tấn công/rủi ro nếu contract có lỗi).

## 6. Bảo vệ reentrancy

Cả `rentProperty`, `payRent`, `endLease` đều có modifier `nonReentrant`
(`@openzeppelin/contracts/utils/ReentrancyGuard.sol`) và tuân theo pattern
**checks-effects-interactions**: cập nhật state (`p.status`, `p.depositHeld`,
`p.rentPaidCount`) **trước** khi gọi `.call{value: ...}("")` chuyển ETH — nhờ vậy dù bên
nhận là một contract độc hại cố gọi lại (`re-enter`) cũng không khai thác được state cũ.
