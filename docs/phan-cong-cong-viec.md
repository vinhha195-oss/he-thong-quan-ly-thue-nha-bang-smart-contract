# Phân công công việc

> Nhóm 1 thành viên — không có bảng phân chia giữa nhiều người. Mục này liệt kê toàn bộ
> đầu việc đã thực hiện, theo từng mảng, để làm rõ phạm vi công việc đã hoàn thành thay
> vì tài liệu chỉ có nghĩa khi có ≥ 2 người phân công cho nhau.

**Thành viên thực hiện**: _(điền tên + MSSV của bạn)_
**Vai trò**: Toàn bộ — phân tích bài toán, thiết kế kiến trúc, viết smart contract,
viết test, xây dựng frontend/backend, rà soát bảo mật, viết tài liệu.

## Bảng đầu việc theo mảng

| Mảng | Đầu việc | Sản phẩm |
|---|---|---|
| Phân tích & thiết kế | Phân tích bài toán, chọn actor, chọn loại token, thiết kế use case/kiến trúc, thiết kế dữ liệu | [phan-tich-bai-toan.md](./phan-tich-bai-toan.md), [lua-chon-token.md](./lua-chon-token.md), [kien-truc-va-usecase.md](./kien-truc-va-usecase.md), [thiet-ke-du-lieu.md](./thiet-ke-du-lieu.md) |
| Smart contract | Viết `RentalAgreementToken.sol` (ERC-721 không chuyển nhượng) và `RentalManager.sol` (nghiệp vụ thuê nhà), áp dụng `ReentrancyGuard` + checks-effects-interactions | `contracts/RentalAgreementToken.sol`, `contracts/RentalManager.sol` |
| Test | Viết 28 test case (nghiệp vụ + token + IPFS CID + phạt trễ hạn + trọng tài/multisig + bảo mật: chặn `safeTransferFrom`, chặn reentrancy qua contract độc hại) | `test/RentalManager.test.ts`, `contracts/mocks/MaliciousReceiver.sol` |
| Triển khai (deploy) | Viết Hardhat Ignition module, deploy local + hướng dẫn deploy Sepolia bằng Hardhat keystore | `ignition/modules/RentalSystem.ts`, `README.md` |
| Frontend | Thiết kế kiến trúc tách UI/BE (service layer `RentalService` dùng chung cho mock và chain), xây UI React kết nối MetaMask | `frontend/src/` (`services/`, `context/`, `components/`) |
| Backend | Xây event indexer đọc blockchain + REST API tra cứu nhanh (SQLite) | `backend/src/` |
| Bảo mật | Cài & thử chạy Slither, ghi nhận giới hạn kỹ thuật gặp phải, rà soát bảo mật thủ công thay thế, viết checklist production | [bao-mat-slither.md](./bao-mat-slither.md), [production-checklist.md](./production-checklist.md), [gioi-han-va-rui-ro.md](./gioi-han-va-rui-ro.md) |
| Tổng hợp | Chạy demo end-to-end (local node + deploy + backend + frontend), viết báo cáo kết quả, nhật ký sử dụng AI | [bao-cao-ket-qua.md](./bao-cao-ket-qua.md), [nhat-ky-su-dung-ai.md](./nhat-ky-su-dung-ai.md) |

## Việc còn lại tự thực hiện (ngoài phạm vi công cụ)

- Quay video demo 5–10 phút.
- Khởi tạo git repository, tạo repo GitHub, push mã nguồn.
- Điền tên/MSSV thật vào đầu tài liệu này.
- (Tuỳ chọn) Deploy thật lên Sepolia bằng ví riêng có SepETH.
