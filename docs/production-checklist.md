# Checklist trước khi lên production/mainnet thật (Bước 4, mục 12)

Áp dụng cho đề tài "Hệ thống quản lý thuê nhà bằng smart contract". Đây là **tình trạng
thật** tại thời điểm bàn giao đồ án — mục nào chưa làm được ghi rõ ❌ và giải thích lý
do, **không đánh dấu ✓ giả**.

## 1. Smart contract

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Unit test cho toàn bộ luồng nghiệp vụ chính | ✅ Đã làm | 18 test (`test/RentalManager.test.ts`): đăng tin, đặt cọc, trả tiền, bàn giao, tất toán, CID ảnh IPFS, các trường hợp bị chặn, token đại diện hợp đồng. |
| Test bảo mật riêng (reentrancy, transfer bị chặn) | ✅ Đã làm | Test cả 2 overload `safeTransferFrom` bị chặn; test contract độc hại cố gọi lại `rentProperty` trong `onERC721Received`, xác nhận `nonReentrant` chặn được. |
| Checks-effects-interactions cho mọi hàm chuyển ETH | ✅ Đã làm | `rentProperty`, `payRent`, `endLease` — state cập nhật trước, gọi ngoài sau. |
| Custom error thay vì string revert (tiết kiệm gas) | ⚠️ Một phần | `RentalAgreementToken` dùng custom error; `RentalManager` vẫn dùng `require(..., "string")` cho các rule nghiệp vụ chính — chưa đổi vì đổi sẽ ảnh hưởng đến các `revertedWith("...")` hiện có trong frontend/test, không cấp bách cho phạm vi đồ án. |
| Static analysis tự động (Slither) | ❌ Chưa chạy được | Gặp lỗi tương thích `crytic-compile` với định dạng build-info của Hardhat 3, và lỗi resolve import của bản `solc` native trên đường dẫn có Unicode — xem chi tiết và rà soát thủ công thay thế tại [docs/bao-mat-slither.md](./bao-mat-slither.md). |
| Fuzz / invariant test (Foundry) | ❌ Chưa làm | Không cài Foundry trong lần này (quyết định phạm vi — xem plan: tốn thời gian cài đặt trên Windows không tương xứng lợi ích cho một đồ án). **Cần làm trước khi lên mainnet thật.** |
| Audit độc lập bên ngoài (bên thứ ba/giảng viên rà soát) | ❌ Chưa có | Đây là việc **con người phải tự thực hiện** (giảng viên/nhóm/bên kiểm toán độc lập), không phải việc code có thể tự làm thay. Rà soát thủ công trong `docs/bao-mat-slither.md` không thay thế được một audit thật. |
| Cơ chế tạm dừng khẩn cấp (`Pausable`) | ❌ Chưa có | Nếu phát hiện lỗi nghiêm trọng sau khi deploy, hiện không có cách nào tạm dừng hệ thống. Cần thêm `Pausable` + vai trò `PAUSER_ROLE` trước production thật. |
| Quản trị admin bằng multisig | ❌ Chưa có | `RentalAgreementToken.DEFAULT_ADMIN_ROLE` hiện là một địa chỉ EOA đơn (ví deploy) — rủi ro tập trung quyền lực nếu khoá bị lộ (xem mục #9 trong `bao-mat-slither.md`). Production thật nên chuyển admin sang ví multisig (vd Safe). |

## 2. Backend / hạ tầng

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Event indexer đọc on-chain, ghi lại off-chain để tra cứu nhanh | ✅ Đã làm | `backend/src/indexer.ts` — quét theo cursor, chờ `CONFIRMATIONS`, idempotent. |
| REST API tra cứu | ✅ Đã làm | `backend/src/server.ts` — `/health`, `/api/properties`, `/api/properties/:id`, `/api/history/:id`. |
| Database production-grade (đa kết nối đồng thời) | ❌ Chưa có | Đang dùng SQLite (`node:sqlite`) — phù hợp demo/đồ án, không phù hợp production nhiều tiến trình ghi đồng thời. Cần chuyển sang PostgreSQL (đổi driver, schema tương đương) — xem `backend/README.md`. |
| Cơ chế đối soát khi reorg sâu | ❌ Chưa có | Chỉ giảm thiểu bằng `CONFIRMATIONS`, chưa có reconciliation job riêng khi phát hiện lệch dữ liệu. |
| Bí mật (RPC key, private key) không nằm trong code/git | ✅ Đã làm | Root project dùng Hardhat keystore (không còn dotenv cho secret khi deploy Sepolia); `backend/.env` nằm trong `.gitignore`. |
| Giám sát/logging tập trung (production monitoring) | ❌ Chưa có | Hiện chỉ log ra console. Production thật cần structured logging + alerting. |

## 3. Vận hành / pháp lý (ngoài phạm vi code)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Cơ chế trọng tài khi tranh chấp khấu trừ cọc | ❌ Chưa code | Đã thiết kế hướng giải quyết (`ARBITER_ROLE` + `TimelockController`) tại [docs/gioi-han-va-rui-ro.md](./gioi-han-va-rui-ro.md#41-cơ-chế-trọng-tài-khi-có-tranh-chấp), chưa triển khai. |
| Giá trị pháp lý của "hợp đồng thuê" on-chain | ❌ Ngoài phạm vi | Token `RentalAgreementToken` chỉ là bằng chứng kỹ thuật số trên chain, không tự động có giá trị pháp lý ngoài đời — cần văn bản giấy/điện tử có chữ ký kèm theo trong triển khai thật. |

## 4. Kết luận

Các hạng mục ❌ ở trên là **giới hạn đã biết của phạm vi đồ án**, không phải sai sót bị
bỏ sót ngoài ý muốn. Trước khi đưa hệ thống này ra vận hành với tiền thật trên mainnet,
bắt buộc phải hoàn thành ít nhất: Slither/static-analysis chạy được, audit độc lập, cơ
chế `Pausable`, và multisig cho admin.
