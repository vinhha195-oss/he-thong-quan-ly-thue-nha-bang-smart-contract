# Báo cáo kết quả — Hệ thống quản lý thuê nhà bằng smart contract

## 1. Tóm tắt

Đề tài xây dựng một hệ thống quản lý thuê nhà chạy trên smart contract Ethereum, tự
động hoá việc giữ tiền cọc, thu tiền thuê định kỳ, xác nhận bàn giao và tất toán hợp
đồng — thay thế cho việc phải "tin tưởng" một bên trung gian là con người. Toàn bộ 8
chức năng tối thiểu theo đề bài đã hoàn thành và có test tự động; hệ thống đã deploy và
chạy được trên mạng Hardhat local (có hướng dẫn deploy Sepolia), có giao diện web kết
nối MetaMask, có backend index dữ liệu on-chain, và đã qua một vòng rà soát bảo mật.

## 2. Mục tiêu & phạm vi

Xem chi tiết bài toán, actor, và phạm vi chức năng tại
[phan-tich-bai-toan.md](./phan-tich-bai-toan.md). Tóm tắt nhanh:

- **Chức năng tối thiểu (8/8 đã hoàn thành)**: đăng tài sản, đặt cọc (đồng thời tạo hợp
  đồng), thanh toán định kỳ, xác nhận bàn giao, hoàn/khấu trừ cọc, kết thúc hợp đồng,
  theo dõi lịch sử thanh toán.
- **Chức năng nâng cao (chưa code, có thiết kế đề xuất)**: cơ chế trọng tài khi tranh
  chấp, phạt thanh toán trễ, multisig cho giải ngân tiền cọc — xem
  [gioi-han-va-rui-ro.md § 4](./gioi-han-va-rui-ro.md#4-hướng-phát-triển).

## 3. Kiến trúc & công nghệ

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Smart contract | Solidity 0.8.24, OpenZeppelin 5.x (`ERC721`, `AccessControl`, `ReentrancyGuard`) | 2 contract: `RentalAgreementToken` (token) + `RentalManager` (nghiệp vụ) |
| Môi trường dev | Hardhat 3 + TypeScript (ESM), Hardhat Ignition (deploy), Hardhat keystore (bí mật) | Bám theo bộ công cụ trong tài liệu quy trình mẫu |
| Blockchain | Hardhat Local Network (đã demo), Ethereum Sepolia testnet (đã hướng dẫn deploy) | |
| Frontend | ReactJS + Vite, ethers.js v6, MetaMask | Tách UI khỏi nguồn dữ liệu qua lớp `RentalService` (interface chung cho `MockRentalService`/`ChainRentalService`) |
| Backend | Node.js + TypeScript, Express, `node:sqlite` | Event indexer + REST API, không phải nguồn dữ liệu chính — chỉ là lớp chỉ mục để tra cứu nhanh |
| Lưu tệp | IPFS (`Property.imageCID`) | Ảnh phòng (không bắt buộc, chọn được nhiều ảnh) tham chiếu bằng danh sách CID cách nhau dấu phẩy; upload trực tiếp qua Pinata nếu người dùng tự cấu hình `VITE_PINATA_JWT`, hoặc dán CID đã upload sẵn — cùng nguyên tắc với việc tự cấu hình khoá Sepolia |
| Test | Hardhat Test + Chai (Mocha) | 19 test case |
| Bảo mật | Slither (gặp giới hạn tương thích) + rà soát thủ công | Xem mục 6 |
| Quản lý mã nguồn | Git/GitHub | Xem mục 8 |

Sơ đồ kiến trúc, sequence diagram chi tiết: [kien-truc-va-usecase.md](./kien-truc-va-usecase.md).
Vì sao chọn ERC-721 không chuyển nhượng và tách 2 contract:
[lua-chon-token.md](./lua-chon-token.md).
Cấu trúc struct/enum/event của contract: [thiet-ke-du-lieu.md](./thiet-ke-du-lieu.md).

### 3.1. Vì sao tách token (`RentalAgreementToken`) khỏi nghiệp vụ (`RentalManager`)

Đây là thay đổi kiến trúc quan trọng nhất so với bản đầu tiên (một contract duy nhất):
mỗi lượt thuê thành công (`rentProperty`) mint một token ERC-721 **không chuyển
nhượng** cho người thuê, đại diện cho quyền của hợp đồng thuê đó (`tokenId ==
propertyId`). Token chỉ ghi nhận "ai đang giữ quyền", còn toàn bộ luật nghiệp vụ (đặt
cọc bao nhiêu, ai được trả tiền, khấu trừ thế nào) vẫn nằm trong `RentalManager`. Nhờ
tách như vậy, toàn bộ chữ ký hàm/event công khai của `RentalManager` không đổi so với
bản gốc — **frontend không cần sửa gì** khi thêm token vào.

## 4. Chức năng đã triển khai

| # | Chức năng | Hàm smart contract | Trạng thái |
|---|---|---|---|
| 1 | Chủ nhà đăng thông tin tài sản | `listProperty` | ✅ |
| 2 | Người thuê đặt cọc | `rentProperty` | ✅ |
| 3 | Tạo hợp đồng thuê | Gộp vào `rentProperty` (đặt cọc = kích hoạt hợp đồng) + mint token đại diện | ✅ |
| 4 | Thanh toán định kỳ | `payRent` | ✅ |
| 5 | Xác nhận bàn giao | `confirmHandover` | ✅ |
| 6 | Hoàn/khấu trừ tiền đặt cọc | `endLease` | ✅ |
| 7 | Kết thúc hợp đồng | Gộp vào `endLease` | ✅ |
| 8 | Theo dõi lịch sử thanh toán | Đọc event trực tiếp từ blockchain (tab "Lịch sử" trên UI) + REST API backend | ✅ |

## 5. Kết quả kiểm thử

Chạy `npx hardhat test` — **19/19 test pass**:

```
RentalManager
  ✔ Chu nha dang tai san thanh cong
  ✔ Nguoi thue dat coc dung so tien -> hop dong kich hoat
  ✔ Chan dat coc sai so tien
  ✔ Chan chu nha tu thue nha cua minh
  ✔ Tien coc do contract giu, khong vao vi chu nha
  ✔ Nguoi thue tra tien -> chuyen thang cho chu nha
  ✔ Chan nguoi la tra tien thue
  ✔ Ket thuc hop dong: hoan coc dung sau khi khau tru
  ✔ Chan ket thuc khi chua ban giao
  ✔ Chan khau tru vuot qua tien coc
  ✔ Luu va tra ve dung CID anh IPFS khi dang tai san
  ✔ Luu va tra ve dung ghi chu cua chu nha khi dang tai san
  ✔ Chi chu nha moi duoc ket thuc hop dong
  RentalAgreementToken (token dai dien hop dong thue)
    ✔ Mint token cho nguoi thue khi dat coc thanh cong
    ✔ Khong the chuyen nhuong token hop dong thue
    ✔ Nguoi khong co MINTER_ROLE khong tu mint duoc token
    ✔ Token van ton tai (khong bi xoa) sau khi ket thuc hop dong
    ✔ Chan ca hai overload cua safeTransferFrom, khong chi transferFrom
  Bao mat: chong reentrancy khi mint token trong rentProperty
    ✔ Nguoi thue la contract doc hai khong the goi lai rentProperty trong onERC721Received

19 passing (751ms)
```

Test bao phủ cả nghiệp vụ chính lẫn 2 kịch bản bảo mật riêng: chặn cả hai overload của
`safeTransferFrom` (không chỉ `transferFrom`), và một contract độc hại cố gọi lại
`rentProperty` ngay trong callback `onERC721Received` để chứng minh `nonReentrant` chặn
được kiểu tấn công reentrancy này.

## 6. Bảo mật

- **Static analysis (Slither)**: đã cài đặt nhưng **không chạy được tự động** trên
  project này do `crytic-compile` chưa hỗ trợ định dạng build-info của Hardhat 3, và
  bản thân `solc` (native, cài qua `solc-select`) lỗi resolve import trên đường dẫn có
  ký tự Unicode của thư mục project. Chi tiết lỗi và hướng khắc phục:
  [bao-mat-slither.md § 2](./bao-mat-slither.md#2-sự-cố-tương-thích-đã-gặp--không-chạy-được-phân-tích-tự-động).
- **Rà soát thủ công thay thế**: 10 hạng mục được rà soát theo đúng nhóm lỗi Slither
  thường phát hiện (reentrancy, access control, unchecked call, zero-address, gas/DoS),
  phân loại rõ Confirmed / Design concern / False positive / Accepted risk — xem bảng
  đầy đủ tại [bao-mat-slither.md § 3](./bao-mat-slither.md#3-rà-soát-bảo-mật-thủ-công-thay-thế-tạm-thời-cho-slither).
  Không phát hiện lỗi nghiêm trọng có thể gây mất tiền/khoá tiền; 2 điểm được đánh dấu
  Confirmed (tập trung quyền lực ở admin token, thiếu cơ chế `Pausable`) là rủi ro quản
  trị đã biết, đưa vào checklist production.
- **Biện pháp đã áp dụng trong code**: `ReentrancyGuard` + checks-effects-interactions
  cho mọi hàm chuyển ETH, kiểm tra giá trị trả về của mọi low-level `.call{value:}`,
  kiểm tra địa chỉ `0x0` ở constructor, token không chuyển nhượng để tránh giả mạo
  quyền sở hữu hợp đồng thuê. Bảng đầy đủ: [gioi-han-va-rui-ro.md § 2](./gioi-han-va-rui-ro.md#2-rủi-ro-bảo-mật-đã-xử-lý).

## 7. Kết quả triển khai (deployment)

- **Local (Hardhat Network)**: đã deploy và demo thành công end-to-end — `npx hardhat
  node` + `npm run deploy` (Hardhat Ignition, deploy `RentalAgreementToken` →
  `RentalManager` → cấp `MINTER_ROLE`) + backend indexer/API + frontend, đã xác minh
  bằng trình duyệt thật: đăng 3 tài sản, 1 tài sản được đặt cọc và trả 1 kỳ tiền thuê,
  giao diện + tab "Lịch sử" hiển thị đúng dữ liệu on-chain, không có lỗi console.
- **Sepolia testnet**: hướng dẫn deploy đầy đủ trong `README.md` (dùng `npx hardhat
  keystore set` để nhập `SEPOLIA_RPC_URL`/`SEPOLIA_PRIVATE_KEY` an toàn, sau đó `npm run
  deploy:sepolia`). Việc deploy thật lên Sepolia là bước người dùng (nhóm) tự thực hiện
  vì cần ví có SepETH thật, không phải việc code có thể tự làm thay.

## 8. Mã nguồn & cấu trúc thư mục

Toàn bộ mã nguồn nằm tại thư mục project (`contracts/`, `test/`, `ignition/`,
`backend/`, `frontend/`, `docs/`) — xem danh sách đầy đủ và mô tả từng phần trong
`README.md`. **Lưu ý**: tại thời điểm viết báo cáo này, thư mục **chưa được khởi tạo
thành git repository** — cần chạy `git init`, tạo repo trên GitHub, và push trước khi
nộp bài để đáp ứng yêu cầu "Mã nguồn trên GitHub".

## 9. Giới hạn còn tồn tại

Xem đầy đủ tại [gioi-han-va-rui-ro.md](./gioi-han-va-rui-ro.md) và
[production-checklist.md](./production-checklist.md). Tóm tắt các điểm chính:

- Chủ nhà tự quyết định mức khấu trừ cọc, không có trọng tài độc lập.
- Không phạt thanh toán trễ.
- Chỉ hỗ trợ thanh toán bằng ETH.
- Chưa có cơ chế tạm dừng khẩn cấp (`Pausable`), chưa có multisig cho admin token.
- Slither không chạy tự động được (xem mục 6); chưa có audit độc lập từ bên ngoài.
- Backend dùng SQLite (đủ cho demo/đồ án), chưa phù hợp production nhiều người dùng
  đồng thời.

## 10. Kết luận

Hệ thống đáp ứng đầy đủ 8/8 chức năng tối thiểu theo đề bài, có kiến trúc tách UI/BE rõ
ràng (cho phép thiết kế giao diện độc lập bằng dữ liệu giả trước khi có contract thật),
có bộ test tự động bao phủ cả nghiệp vụ lẫn bảo mật, và đã được rà soát bảo mật (dù công
cụ tự động Slither gặp giới hạn kỹ thuật, đã có rà soát thủ công thay thế và ghi nhận
minh bạch). Các chức năng nâng cao (trọng tài, phạt trễ hạn, multisig) chưa được code
nhưng đã có thiết kế đề xuất cụ thể để phát triển tiếp.
