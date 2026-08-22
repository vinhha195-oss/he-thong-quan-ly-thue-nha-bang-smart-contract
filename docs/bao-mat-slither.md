# Kiểm thử bảo mật bằng Slither (Bước 4, mục 11)

## 1. Tình trạng cài đặt Slither

Đã cài thành công:

```
python -m pip install --user slither-analyzer
# slither-analyzer 0.11.5, solc 0.8.36 (solc-select)
```

## 2. Sự cố tương thích đã gặp — không chạy được phân tích tự động

**Slither không thể phân tích project này**, vì lý do đã xác định rõ (không phải lỗi ở
contract):

### 2.1. `crytic-compile` chưa hỗ trợ định dạng artifact của Hardhat 3

Chạy `slither .` (chế độ tự nhận diện project Hardhat) báo lỗi:

```
Problem deserializing hardhat configuration, using defaults: Expecting value: line 1 column 1 (char 0)
...
File "crytic_compile\platform\hardhat.py", line 72, in hardhat_like_parsing
    targets_json = loaded_json["output"]
KeyError: 'output'
```

`npx hardhat compile --force` chạy thành công (project vẫn biên dịch bình thường qua
`npx hardhat build`/`npm test`), nhưng `crytic-compile` (thư viện `slither` dùng để đọc
kết quả biên dịch của Hardhat) mong đợi cấu trúc file build-info theo định dạng **Hardhat
2**, trong khi Hardhat 3 (dùng ở project này theo đúng quyết định "bám sát 100% công cụ
trong tài liệu mẫu") đã đổi cấu trúc artifact/build-info. Đây là khoảng trễ hỗ trợ giữa
hai công cụ của hai bên phát triển khác nhau, không phải lỗi trong `RentalManager.sol`
hay `RentalAgreementToken.sol`.

### 2.2. Đường vòng qua solc thuần cũng thất bại — do đường dẫn Unicode trên Windows

Thử đường vòng (`--compile-force-framework solc`, gọi solc trực tiếp thay vì qua
Hardhat) cũng thất bại, nhưng vì lý do **khác**: bản thân lệnh `solc` (bản
`0.8.36+commit.8a079791.Windows.msvc` cài qua `solc-select`) không tự resolve được ngay
cả import **tương đối cùng thư mục** (`import "./RentalAgreementToken.sol";`):

```
solc @openzeppelin/=node_modules/@openzeppelin/ contracts/RentalManager.sol --allow-paths .
Error: Source "contracts/RentalAgreementToken.sol" not found: File not found.
```

Đã xác minh đây là lỗi của bản thân `solc.exe` (không phải do `slither`/`crytic-compile`
gọi sai tham số) bằng cách chạy thẳng lệnh `solc` này độc lập — lỗi giống hệt. Nguyên
nhân nhiều khả năng là **đường dẫn thư mục project chứa ký tự tiếng Việt có dấu và
khoảng trắng** (`D:\Hệ thống quản lý thuê nhà bằng smart contract`), khiến bản solc
native (MSVC) xử lý sai đường dẫn khi tìm file. Hardhat tự biên dịch được vì nó dùng
bản **solc WASM** (tải riêng, chạy qua Node.js — Node xử lý Unicode path bình thường),
trong khi `solc-select` cài bản solc native cho Windows.

### 2.3. Hướng khắc phục (chưa thực hiện trong lần này)

- Chờ `crytic-compile`/`slither` ra bản hỗ trợ đầy đủ định dạng build-info của
  Hardhat 3, hoặc
- Copy project sang một đường dẫn không dấu/không khoảng trắng (vd `C:\rental-dapp`)
  rồi chạy lại `slither .` từ đó, hoặc
- Cấu hình `solc-select` dùng bản solc WASM thay vì native.

## 3. Rà soát bảo mật thủ công (thay thế tạm thời cho Slither)

Vì không chạy được Slither tự động, đã rà soát thủ công theo đúng các nhóm lỗi Slither
thường phát hiện (reentrancy, access control, unchecked call, zero-address, gas/DoS).

| # | Hạng mục | Kết quả | Phân loại |
|---|---|---|---|
| 1 | Reentrancy ở `rentProperty`/`payRent`/`endLease` | Có `nonReentrant` + checks-effects-interactions (state cập nhật trước khi gọi `.call{value:}` hoặc `mintAgreement`) | **Accepted — đã xử lý** |
| 2 | Giá trị trả về của low-level `.call{value:}` | Luôn kiểm tra bằng `require(ok, ...)`, không bỏ qua | **Accepted — đã xử lý** |
| 3 | `mintAgreement()` gọi trong `rentProperty` không bọc try/catch | Nếu mint revert (vd `RentalManager` chưa được cấp `MINTER_ROLE`), cả giao dịch `rentProperty` revert theo — đây là hành vi **mong muốn** (fail-closed, không cho kích hoạt hợp đồng nếu không tạo được token bằng chứng) | **False positive — đúng thiết kế** |
| 4 | Địa chỉ `0x0` cho `tenant` khi mint | Không kiểm tra tường minh trong `RentalManager`, nhưng `ERC721._safeMint` (OpenZeppelin) tự revert nếu `to == address(0)` | **Accepted — đã có bảo vệ ở tầng dưới** |
| 5 | `getAllProperties()` lặp không giới hạn qua toàn bộ `propertyCount` | Nếu số lượng property rất lớn, có thể tốn nhiều gas khi gọi từ một contract khác (dù gọi trực tiếp qua `eth_call` từ frontend không bị giới hạn gas theo cách này) | **Design concern — đã ghi trong docs/gioi-han-va-rui-ro.md**, chưa khắc phục (cần phân trang nếu mở rộng) |
| 6 | Không có `receive()`/`fallback()` | ETH gửi thẳng vào contract (không gọi hàm) sẽ tự động revert — tránh ETH bị kẹt ngoài ý muốn | **Accepted — hành vi an toàn theo mặc định của Solidity** |
| 7 | Kiểm tra địa chỉ `0x0` ở constructor | Cả 2 contract đều `require`/`revert` nếu `admin`/`tokenAddress` là `address(0)` | **Accepted — đã xử lý** |
| 8 | Double-mint cùng `tokenId` | Không tự kiểm tra tường minh trong `RentalManager`, nhưng `_safeMint` của OpenZeppelin tự revert nếu token đã tồn tại — về logic nghiệp vụ, một `propertyId` chỉ có thể đạt `Status.Active` (điều kiện duy nhất gọi mint) đúng một lần trong vòng đời hiện tại | **Accepted — không khai thác được với logic hiện tại** |
| 9 | Tập trung quyền lực ở `RentalAgreementToken.DEFAULT_ADMIN_ROLE` | Địa chỉ admin (mặc định là ví deploy) có toàn quyền `grantRole`/`revokeRole` cho `MINTER_ROLE` — nếu khoá riêng của admin bị lộ, kẻ tấn công có thể tự cấp quyền mint cho địa chỉ khác và tạo token "hợp đồng thuê" giả (không rút được tiền từ `RentalManager`, nhưng gây nhiễu dữ liệu lịch sử thuê) | **Confirmed — rủi ro tập trung quyền lực, cần multisig cho admin ở production** (xem `docs/production-checklist.md`) |
| 10 | Thiếu cơ chế tạm dừng (`Pausable`) | Không có cách nào tạm dừng hệ thống nếu phát hiện lỗi nghiêm trọng sau khi deploy | **Confirmed — hạn chế đã biết, chưa khắc phục trong lần này** (xem `docs/production-checklist.md`) |

## 4. Kết luận

Không phát hiện lỗi **Confirmed vulnerability** nghiêm trọng (mất tiền/khoá tiền) qua rà
soát thủ công. Hai điểm được đánh dấu **Confirmed** (#9, #10) là rủi ro vận hành/quản trị
đã biết trước, không phải lỗi runtime, và đã được đưa vào
[docs/production-checklist.md](./production-checklist.md) như điều kiện bắt buộc phải xử
lý trước khi triển khai production thật.

Rà soát thủ công **không thay thế được** một audit độc lập hoặc phân tích tĩnh tự động
đầy đủ — đây vẫn là việc cần làm trước khi triển khai production (xem checklist).
