# Thiết kế dữ liệu / cấu trúc smart contract

Nguồn: [`contracts/RentalManager.sol`](../contracts/RentalManager.sol) (nghiệp vụ) và
[`contracts/RentalAgreementToken.sol`](../contracts/RentalAgreementToken.sol) (token
ERC-721 đại diện một hợp đồng thuê — xem lý do tách 2 contract và lý do chọn ERC-721
tại [docs/lua-chon-token.md](./lua-chon-token.md)).

## 1. Enum `Status` — vòng đời một tài sản/hợp đồng

| Giá trị | Tên | Ý nghĩa |
|---|---|---|
| 0 | `Listed` | Chủ nhà đã đăng, chưa có người thuê. |
| 1 | `Active` | Người thuê đã đặt cọc, hợp đồng đang hoạt động. |
| 2 | `HandedOver` | Người thuê đã xác nhận bàn giao (trả phòng); có thể đang chờ chủ nhà đề xuất tất toán, hoặc chờ người thuê phản hồi đề xuất. |
| 3 | `Ended` | Đã tất toán cọc, hợp đồng kết thúc. |
| 4 | `Disputed` | Người thuê không đồng ý mức khấu trừ chủ nhà đề xuất — đang chờ trọng tài (`ARBITER_ROLE`) biểu quyết. |
| 5 | `Cancelled` | Chủ nhà đã hủy tin đăng (`cancelListing`) trong lúc còn `Listed` — vd đăng nhầm giá. Không thể thuê được nữa. |

Chuyển trạng thái gần như một chiều: `Listed → Active → HandedOver → {Ended | Disputed
→ Ended}`, hoặc `Listed → Cancelled` — không có đường lùi thật sự (từ `Disputed` chỉ đi
tiếp tới `Ended`, không quay lại `HandedOver`; `Cancelled` là trạng thái cuối, không đi
tiếp đâu nữa). Mỗi hàm public chỉ cho phép gọi khi contract đang ở đúng trạng thái liền
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
| `imageCID` | `string` | Một hoặc nhiều CID/URL ảnh phòng lưu trên **IPFS**, cách nhau bằng dấu phẩy nếu nhiều ảnh; rỗng (`""`) nếu chủ nhà không đính kèm ảnh. Vẫn chỉ là 1 field `string` — không đổi kiểu dữ liệu on-chain khi hỗ trợ nhiều ảnh. Contract chỉ lưu chuỗi tham chiếu — file ảnh thật nằm trên IPFS, không lưu on-chain. |
| `note` | `string` | Ghi chú tự do của chủ nhà (nội quy, lưu ý…), có thể rỗng (`""`). |
| `nextDueDate` | `uint256` | Hạn trả tiền thuê kỳ tiếp theo (unix seconds). Gán khi `rentProperty` (`startedAt + rentPeriod`), cộng thêm `rentPeriod` mỗi lần `payRent` thành công. Qua hạn mà chưa trả → `payRent` bắt buộc cộng thêm phạt trễ. |
| `proposedDeduction` | `uint256` | Mức khấu trừ tiền cọc chủ nhà đề xuất khi tất toán (wei), gán bởi `proposeSettlement`. |
| `settlementProposed` | `bool` | Đã có đề xuất tất toán đang chờ người thuê phản hồi (`acceptSettlement`/`disputeSettlement`) hay chưa. |

`propertyCount` (uint256) và `mapping(uint256 => Property) properties` lưu toàn bộ
tài sản, id bắt đầu từ 1.

### Cấu hình đặt lúc deploy (`immutable`, không đổi được sau khi lên chain)

| Biến | Kiểu | Ý nghĩa | Giá trị mặc định (Ignition) |
|---|---|---|---|
| `rentPeriod` | `uint256` | Chu kỳ tính hạn trả tiền thuê (giây). | 2.592.000 (30 ngày) |
| `lateFeeBps` | `uint256` | Mức phạt trả trễ, phần vạn (basis points). | 500 (5%) |
| `arbiterApprovalsRequired` | `uint256` | Số trọng tài cần đồng thuận cùng 1 mức khấu trừ mới thi hành khi tranh chấp. | 2 |

### Vai trò (`AccessControl`)

| Vai trò | Ai được cấp |
|---|---|
| `DEFAULT_ADMIN_ROLE` | Địa chỉ `admin` truyền vào constructor (có thể `grantRole(ARBITER_ROLE, ...)` cho thêm trọng tài). |
| `ARBITER_ROLE` | `admin` (mặc định lúc deploy) + bất kỳ địa chỉ nào được `admin` cấp thêm. |

## 3. Event (nguồn cho tab "Lịch sử")

| Event | Khi nào emit | Tham số |
|---|---|---|
| `PropertyListed` | `listProperty` thành công | `id, landlord, title, monthlyRent, deposit` |
| `Rented` | `rentProperty` thành công | `id, tenant, depositPaid, startedAt` |
| `RentPaid` | `payRent` thành công | `id, tenant, amount, latePenalty, paidAt` |
| `HandoverConfirmed` | `confirmHandover` thành công | `id, tenant, confirmedAt` |
| `SettlementProposed` | `proposeSettlement` thành công | `id, deductAmount` |
| `DisputeRaised` | `disputeSettlement` thành công | `id, tenant` |
| `DisputeVoteCast` | `voteOnDispute` thành công | `id, arbiter, deductAmount, voteCount` |
| `LeaseEnded` | `acceptSettlement` hoặc `voteOnDispute` (khi đủ phiếu) thành công | `id, refundToTenant, deductToLandlord, endedAt` |
| `ListingCancelled` | `cancelListing` thành công | `id, landlord` |

Frontend (`ChainRentalService.loadHistory()`) gọi `contract.queryFilter()` cho tất cả
event này rồi gộp + sắp xếp theo `blockNumber` giảm dần — đây là cách "theo dõi lịch sử
thanh toán" mà không cần một database off-chain riêng.

## 4. Hàm public và điều kiện (`require`)

| Hàm | Ai gọi được | Điều kiện chặn | Hiệu ứng tiền |
|---|---|---|---|
| `listProperty(title, location, monthlyRent, deposit, imageCID, note)` | Bất kỳ ai (trở thành chủ nhà) | `monthlyRent > 0` | Không chuyển tiền. `imageCID`/`note` có thể truyền `""` nếu không dùng. |
| `cancelListing(id)` | Đúng `landlord` | tài sản tồn tại; đang `Listed` (chưa ai đặt cọc) | Không chuyển tiền — chuyển sang `Cancelled`, tin không hiển thị thuê được nữa. |
| `rentProperty(id)` payable | Bất kỳ ai trừ chủ nhà | tài sản tồn tại; đang `Listed`; `msg.sender != landlord`; `msg.value == deposit` | ETH gửi kèm **ở lại trong contract** (`depositHeld`); đồng thời mint 1 `RentalAgreementToken` với `tokenId = id` cho người thuê. |
| `payRent(id)` payable | Đúng `tenant` | đang `Active`; `msg.sender == tenant`; `msg.value == monthlyRent (+ phạt trễ nếu quá `nextDueDate`)` | ETH **chuyển thẳng** cho `landlord` qua `call{value:}`. |
| `confirmHandover(id)` | Đúng `tenant` | đang `Active`; `msg.sender == tenant` | Không chuyển tiền. |
| `proposeSettlement(id, deductAmount)` | Đúng `landlord` | đang `HandedOver`; `deductAmount <= depositHeld` | Không chuyển tiền — chỉ ghi nhận đề xuất. |
| `acceptSettlement(id)` | Đúng `tenant` | đang `HandedOver`; đã có đề xuất | Tất toán theo đúng mức đề xuất (xem `_settle`). |
| `disputeSettlement(id)` | Đúng `tenant` | đang `HandedOver`; đã có đề xuất | Không chuyển tiền — chuyển sang `Disputed`. |
| `voteOnDispute(id, deductAmount)` | Địa chỉ có `ARBITER_ROLE` | đang `Disputed`; `deductAmount <= depositHeld`; chưa vote lần nào cho tranh chấp này | Nếu đủ `arbiterApprovalsRequired` phiếu cùng 1 mức → tất toán theo mức đó (xem `_settle`). |
| `getProperty(id)` / `getAllProperties()` | Bất kỳ ai (view) | — | — |

`_settle(id, deductAmount)` (nội bộ, không phải hàm public): chuyển `deductAmount` cho
`landlord`, phần còn lại (`depositHeld - deductAmount`) hoàn cho `tenant`, chuyển trạng
thái sang `Ended`. Được gọi bởi cả `acceptSettlement` lẫn `voteOnDispute` — nghĩa là có
**đúng 2 con đường** dẫn tới `Ended`: người thuê tự đồng ý, hoặc đủ trọng tài đồng thuận.

## 5. Vì sao tiền cọc giữ ở contract còn tiền thuê chuyển thẳng?

- **Tiền cọc** cần một bên trung gian khách quan giữ cho đến khi có xác nhận bàn giao —
  đây chính là điểm khác biệt so với thuê nhà truyền thống (chủ nhà giữ cọc, người thuê
  phải tin tưởng). Contract đóng vai trò "ký quỹ" (escrow).
- **Tiền thuê định kỳ** không có tranh chấp về việc "ai giữ" — trả xong là xong nghĩa vụ
  kỳ đó, nên chuyển thẳng cho chủ nhà ngay khi `payRent` thành công, giảm số dư đọng
  trong contract (giảm bề mặt tấn công/rủi ro nếu contract có lỗi).

## 6. Bảo vệ reentrancy

Tất cả hàm có chuyển ETH (`rentProperty`, `payRent`, `acceptSettlement`,
`voteOnDispute`) đều có modifier `nonReentrant`
(`@openzeppelin/contracts/utils/ReentrancyGuard.sol`) và tuân theo pattern
**checks-effects-interactions**: cập nhật state (`p.status`, `p.depositHeld`,
`p.rentPaidCount`, `p.nextDueDate`) **trước** khi gọi `.call{value: ...}("")` chuyển ETH
— nhờ vậy dù bên nhận là một contract độc hại cố gọi lại (`re-enter`) cũng không khai
thác được state cũ. Việc mint token trong `rentProperty` cũng đặt **sau** khi cập nhật
state + emit event, theo đúng nguyên tắc này (xem mục 7 bên dưới).

## 7. Contract `RentalAgreementToken` (token đại diện hợp đồng thuê)

ERC-721 (`OpenZeppelin ERC721` + `AccessControl`), tên `"Rental Agreement"`, ký hiệu
`"LEASE"`. Không kế thừa từ `RentalManager`, được `RentalManager` gọi sang qua địa chỉ
lưu tại biến `immutable agreementToken`.

### Vai trò

| Vai trò | `bytes32` | Ai được cấp |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00` | Địa chỉ deploy (`admin` truyền vào constructor) |
| `MINTER_ROLE` | `keccak256("MINTER_ROLE")` | Địa chỉ `RentalManager` (cấp qua Ignition module sau khi deploy) |

### Hàm

| Hàm | Ai gọi được | Ghi chú |
|---|---|---|
| `mintAgreement(tenant, propertyId)` | Chỉ `MINTER_ROLE` | Mint token `tokenId = propertyId` cho `tenant`. Revert `AccessControlUnauthorizedAccount` nếu gọi sai vai trò. |
| `transferFrom` / `safeTransferFrom` (kế thừa từ `ERC721`) | — | **Luôn revert** `TransferNotAllowed()` — token khoá vĩnh viễn sau khi mint (override `_update`). |
| `approve` / `setApprovalForAll` | — | **Luôn revert** `TransferNotAllowed()` — không cần approve vì không thể chuyển nhượng. |
| `ownerOf(tokenId)` (kế thừa) | Bất kỳ ai (view) | Trả về địa chỉ người thuê đã/đang giữ hợp đồng thuê đó — không đổi kể cả sau `endLease`. |

Không có hàm `burn` — token tồn tại vĩnh viễn kể cả sau khi hợp đồng `Ended`, đóng vai
trò bằng chứng lịch sử "đã từng thuê tài sản này", giống nguyên tắc "không xoá lịch sử"
ở ví dụ chứng chỉ.

### Sơ đồ quan hệ

```
RentalManager.rentProperty(id)
        │  (sau khi cap nhat xong Property state + emit Rented)
        ▼
RentalAgreementToken.mintAgreement(tenant, id)
        │
        ▼
ownerOf(id) == tenant   (vinh vien, khong the transfer/burn)
```
