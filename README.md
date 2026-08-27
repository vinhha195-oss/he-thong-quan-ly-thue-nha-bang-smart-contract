# Hệ thống quản lý thuê nhà bằng smart contract

Đồ án môn Chuỗi khối và ứng dụng. Hệ thống đưa quá trình đặt cọc, thanh toán tiền thuê
và tất toán hợp đồng lên blockchain, để smart contract giữ tiền cọc một cách khách quan
và ghi lại mọi giao dịch minh bạch, không thể chỉnh sửa.

## Công nghệ

- **Smart contract:** Solidity + OpenZeppelin (`ERC721`, `AccessControl`,
  `ReentrancyGuard`) — 2 contract tách riêng token và nghiệp vụ, xem
  [docs/lua-chon-token.md](docs/lua-chon-token.md)
- **Môi trường:** Hardhat 3 + TypeScript (biên dịch, test, mạng blockchain local,
  triển khai bằng Hardhat Ignition)
- **Giao diện:** ReactJS (Vite) + ethers.js, kết nối ví MetaMask
- **Lưu tệp:** IPFS — ảnh phòng cho thuê (không bắt buộc) được tham chiếu bằng CID lưu
  trong `Property.imageCID`, file thật nằm trên IPFS chứ không lưu on-chain. Xem
  `frontend/src/utils/ipfs.js` và `.env.example` (biến `VITE_PINATA_JWT`, tuỳ chọn).
- **Backend (tuỳ chọn):** Node.js + TypeScript, index event từ blockchain vào SQLite,
  expose REST API — xem [backend/README.md](backend/README.md)

## Cấu trúc thư mục

```
rental-dapp/
├── contracts/
│   ├── RentalManager.sol            # Nghiệp vụ: đăng/thuê/trả tiền/bàn giao/tất toán
│   └── RentalAgreementToken.sol     # ERC-721 không chuyển nhượng, đại diện 1 hợp đồng thuê
├── ignition/modules/RentalSystem.ts # Triển khai 2 contract + cấp MINTER_ROLE (Hardhat Ignition)
├── scripts/sync-frontend-config.ts  # Đọc dia chỉ đã deploy, ghi sang frontend/src/config.js
├── scripts/grant-arbiter.ts         # Cấp ARBITER_ROLE cho 1 địa chỉ (multisig cần ≥2 trọng tài)
├── test/RentalManager.test.ts       # Bộ test TypeScript (Hardhat 3 + Mocha)
├── hardhat.config.ts                # Mạng: localhost + sepolia (bí mật qua Hardhat keystore)
├── backend/                         # Event indexer + REST API (SQLite) — tuỳ chọn, xem Bước 4
├── docs/                            # Phân tích bài toán, chọn loại token, use case/kiến
│                                     # trúc, thiết kế dữ liệu, giới hạn & rủi ro bảo mật
└── frontend/                        # Giao diện web React (Vite)
    └── src/
        ├── config.js                 # Địa chỉ + ABI của RentalManager (tự sinh khi deploy)
        ├── mock/fixtures.js          # Dữ liệu mẫu cho chế độ mock
        ├── services/                 # Lớp "BE": RentalService (interface chung),
        │                             # ChainRentalService (ethers.js thật),
        │                             # MockRentalService (dữ liệu mẫu, không cần ví)
        ├── context/RentalContext.jsx # Nơi UI lấy state/gọi hành động
        ├── hooks/useRental.js
        ├── components/               # UI thuần, không biết gì về ethers/blockchain
        └── App.jsx
```

Frontend chỉ gọi vào `RentalManager` — `RentalAgreementToken` là chi tiết nội bộ, không
cần đổi gì bên frontend dù kiến trúc contract có 2 hợp đồng thay vì 1.

**Kiến trúc tách UI/BE**: mọi component trong `components/` chỉ nhận props và callback,
không gọi ethers.js trực tiếp. Toàn bộ logic đọc/ghi blockchain nằm trong `services/`,
với 2 cài đặt hoán đổi được cho cùng một interface — nhờ vậy có thể thiết kế/kiểm tra
giao diện bằng dữ liệu mẫu trước, rồi chuyển sang blockchain thật mà không sửa UI. Chi
tiết sơ đồ kiến trúc: [docs/kien-truc-va-usecase.md](docs/kien-truc-va-usecase.md).

---

## Chuẩn bị (làm 1 lần)

1. Cài **Node.js** (bản 18 trở lên): https://nodejs.org
2. Cài tiện ích **MetaMask** cho trình duyệt Chrome: https://metamask.io

---

## Thiết kế UI bằng dữ liệu mẫu (mock) — không cần deploy contract

Muốn chỉnh sửa/xem giao diện ngay mà chưa cần chạy blockchain? Mặc định, khi
`frontend/src/config.js` **chưa có ABI thật** (tức chưa deploy), ứng dụng tự động dùng
`MockRentalService` (`frontend/src/services/MockRentalService.js`) với dữ liệu mẫu — 4
phòng ở đủ 4 trạng thái (`Listed/Active/HandedOver/Ended`) + lịch sử giao dịch mẫu:

```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt: sẽ thấy badge **"Chế độ: Dữ liệu mẫu (mock)"** ở đầu trang, kèm nút đổi
vai (Chủ nhà / Người thuê / Người lạ) để test toàn bộ luồng nghiệp vụ — đặt cọc, trả
tiền, bàn giao, tất toán — mà không cần MetaMask hay chạy `hardhat node`.

Muốn ép buộc chế độ này dù đã deploy contract (hoặc ngược lại, ép buộc dùng blockchain
thật), tạo file `frontend/.env` từ `frontend/.env.example` và đặt `VITE_USE_MOCK=true`
(hoặc `false`). Chi tiết cơ chế chọn service: [docs/kien-truc-va-usecase.md](docs/kien-truc-va-usecase.md#4-lựa-chọn-service-mock--chain).

---

## Các bước chạy

> Bạn sẽ cần mở **2 cửa sổ dòng lệnh (terminal)** cùng lúc: một để chạy blockchain, một để chạy giao diện.

### Bước 1 — Cài đặt thư viện

Mở terminal tại thư mục `rental-dapp`, chạy:

```bash
npm install
cd frontend && npm install && cd ..
```

### Bước 2 — Chạy blockchain local (terminal 1)

```bash
npx hardhat node
```

Cửa sổ này sẽ hiện ra **danh sách 20 tài khoản test**, mỗi tài khoản có 10000 ETH và một
**Private Key**. Cứ để cửa sổ này chạy, đừng tắt. Lát nữa ta sẽ nạp vài tài khoản này vào MetaMask.

### Bước 3 — Deploy smart contract (terminal 2)

Mở terminal thứ hai (vẫn ở thư mục `rental-dapp`):

```bash
npm run deploy
```

Lệnh này dùng **Hardhat Ignition** để deploy cả 2 contract (`RentalAgreementToken` rồi
`RentalManager`, tự cấp quyền mint), sau đó **tự động** ghi địa chỉ + ABI của
`RentalManager` vào `frontend/src/config.js` (bạn không phải copy-paste gì cả).

> Nếu deploy lại nhiều lần trên cùng một `hardhat node` đang chạy, không cần xoá gì cả.
> Nhưng nếu bạn **tắt rồi bật lại** `hardhat node` (bước 2), phải xoá thư mục deployment
> cũ trước khi deploy lại: `rm -rf ignition/deployments/chain-31337` (Hardhat Ignition
> lưu trạng thái deploy trên đĩa, nếu không xoá nó sẽ tưởng đã deploy rồi và bỏ qua).

### Bước 4 — Chạy giao diện web (terminal 2)

```bash
cd frontend
npm run dev
```

Mở trình duyệt tại địa chỉ hiện ra (thường là `http://localhost:5173`).

---

## Cấu hình MetaMask (làm 1 lần)

### Thêm mạng blockchain local

MetaMask → menu mạng → **Add network manually**:

- Network name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

### Nạp tài khoản test để có 2 vai

Từ cửa sổ `npx hardhat node` (bước 2), copy **Private Key** của **Account #0** và **Account #1**.
Trong MetaMask → **Import account** → dán private key.

- **Account #0** → dùng làm **Chủ nhà**
- **Account #1** → dùng làm **Người thuê**

> Khi demo, bạn chuyển qua lại giữa hai tài khoản này trong MetaMask để đóng hai vai.

---

## Deploy lên Sepolia testnet (tuỳ chọn)

Mặc định chỉ cần mạng Hardhat local là đủ cho yêu cầu tối thiểu. Muốn deploy lên một
testnet thật (Sepolia), Hardhat 3 lưu bí mật (RPC URL, private key) trong **keystore mã
hoá cục bộ** thay vì file `.env` — an toàn hơn vì không có file plaintext nào có thể lỡ
tay commit lên GitHub:

1. Lưu RPC URL vào keystore (lệnh sẽ hỏi bạn đặt mật khẩu keystore rồi nhập giá trị):
   ```bash
   npx hardhat keystore set SEPOLIA_RPC_URL
   ```
   Giá trị: RPC URL đăng ký miễn phí ở [Alchemy](https://www.alchemy.com/) hoặc
   [Infura](https://www.infura.io/), tạo app cho mạng Sepolia — hoặc dùng RPC công khai
   `https://ethereum-sepolia-rpc.publicnode.com` (không cần đăng ký).
2. Lưu private key vào keystore:
   ```bash
   npx hardhat keystore set SEPOLIA_PRIVATE_KEY
   ```
   Giá trị: private key của **một ví test riêng** — tuyệt đối không dùng ví có tiền thật.
3. Lấy ETH Sepolia miễn phí từ faucet, ví dụ
   https://www.alchemy.com/faucets/ethereum-sepolia hoặc https://sepolia-faucet.pk910.de/.
4. Deploy:
   ```bash
   npm run deploy:sepolia
   ```
   Lệnh này chạy Hardhat Ignition trên mạng Sepolia rồi ghi địa chỉ + ABI vào
   `frontend/src/config.js` giống hệt deploy local.
5. Đổi mạng MetaMask sang **Sepolia** (có sẵn trong danh sách mạng mặc định), rồi chạy
   `cd frontend && npm run dev` như bình thường.

> Xem lại giá trị đã lưu: `npx hardhat keystore list`. Xoá một giá trị: `npx hardhat
> keystore delete <TÊN_BIẾN>`.

### Cấp thêm trọng tài (`ARBITER_ROLE`) sau khi deploy

Mặc định lúc deploy chỉ ví admin (ví dùng để deploy) có `ARBITER_ROLE`, trong khi cơ chế
multisig cần `arbiterApprovalsRequired` trọng tài **độc lập** (mặc định 2) mới tất toán
được khi có tranh chấp — cần cấp thêm ít nhất 1 địa chỉ khác:

```bash
ARBITER_ADDRESS=0xDiaChiViKhac npx hardhat run scripts/grant-arbiter.ts --network sepolia
```

(Đổi `--network sepolia` thành `--network localhost` nếu đang test trên máy.) Có thể
gọi lại nhiều lần với các địa chỉ khác nhau để có nhiều trọng tài.

---

## Deploy frontend lên Vercel (tự động deploy lại mỗi khi push)

Vercel chỉ host được phần giao diện (`frontend/`) — smart contract phải deploy lên
Sepolia trước (mục trên), vì contract "Hardhat Local" chỉ chạy được trên máy bạn, không
ai khác truy cập được.

**Làm 1 lần — kết nối repo với Vercel:**

1. Đưa code lên GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin <URL repo GitHub của bạn>
   git push -u origin main
   ```
2. Vào [vercel.com](https://vercel.com) → **Add New... → Project** → chọn repo vừa push.
3. Ở màn hình cấu hình project, **bắt buộc** đổi **Root Directory** thành `frontend`
   (bấm "Edit" cạnh mục Root Directory) — vì repo gốc còn có phần Hardhat, chỉ thư mục
   `frontend` mới là app web. Sau khi chọn đúng, Vercel tự nhận Framework Preset là
   **Vite**, Build Command `npm run build`, Output Directory `dist` (đã ghi sẵn trong
   `frontend/vercel.json` để chắc chắn không bị nhận nhầm).
4. Mục **Environment Variables**, thêm:
   - `VITE_USE_MOCK` = `false` (ép trang public luôn dùng blockchain thật, không rơi về mock).
5. Bấm **Deploy**. Sau vài chục giây có link dạng `https://<tên-project>.vercel.app`.

**Từ lần sau — tự động deploy khi commit:** đây là hành vi mặc định của Vercel khi đã
kết nối GitHub, không cần cấu hình thêm gì:

- Push lên nhánh `main` → Vercel tự build + deploy lại bản **Production** (chính là URL ở trên).
- Push lên nhánh khác / mở Pull Request → Vercel tự tạo một **Preview deployment** riêng để xem trước.

**Lưu ý quan trọng:** Vercel chỉ biết "có push code mới", nó không tự biết bạn vừa
deploy lại smart contract. Nếu sau này bạn chạy lại `npm run deploy:sepolia` (địa chỉ
contract đổi), nhớ `git add frontend/src/config.js && git commit && git push` thì bản
Vercel mới nhận được địa chỉ contract mới.

---

## Kịch bản demo (5–10 phút) — 2 trình duyệt, dữ liệu thật trên Sepolia

Dùng khi đã deploy thật lên Sepolia và trang Vercel đang ở "Chế độ: Blockchain" (xem
mục deploy ở trên). Mở **2 trình duyệt khác nhau** (hoặc 1 trình duyệt thường + 1
cửa sổ ẩn danh), mỗi bên đăng nhập MetaMask bằng **1 ví Sepolia riêng có sẵn SepETH**:

- **Trình duyệt A = Chủ nhà**
- **Trình duyệt B = Người thuê**

Cả 2 đều mở link Vercel, đảm bảo MetaMask đang chọn đúng mạng **Sepolia**.

> Vì đây là ETH thật trên testnet (không phải mạng local vô hạn như trước), dùng số
> tiền **nhỏ** để tiết kiệm SepETH cho nhiều lần test — vd tiền thuê `0.001`, cọc
> `0.002`. Mỗi hành động đều tốn thêm 1 khoản phí gas nhỏ (~0.0001–0.0005 ETH),
> MetaMask sẽ hiện popup xác nhận cho mọi giao dịch — nhớ bấm **Confirm**.

1. **[A] Chủ nhà** → tab *Đăng cho thuê* → điền: mô tả phòng, khu vực, tiền thuê
   `0.001`, cọc `0.002` — có thể thêm ảnh (chọn file) và ghi chú để demo đủ tính
   năng → **Đăng tài sản** → xác nhận giao dịch trên MetaMask.
2. **[B] Người thuê** → tab *Danh sách phòng* → dùng ô tìm kiếm nếu cần → bấm vào
   phòng vừa tạo để xem chi tiết (ảnh, ghi chú, đầy đủ thông tin) → **Đặt cọc &
   thuê** → xác nhận trên MetaMask. Chú ý: 0.002 ETH bị khóa trong hợp đồng, chưa
   vào ví chủ nhà.
3. **[B] Người thuê** → **Trả tiền thuê** (0.001 ETH chảy thẳng sang ví chủ nhà,
   kiểm tra số dư ví A tăng lên ngay).
4. **[B] Người thuê** → **Xác nhận bàn giao**.
5. **[A] Chủ nhà** → mở lại phòng đó → **Đề xuất tất toán**, nhập khấu trừ `0.0005`.
6. Chọn 1 trong 2 nhánh để demo:
   - **Đồng ý ngay**: **[B] Người thuê** → bấm **Đồng ý khấu trừ 0.0005 ETH** → hệ
     thống tự hoàn `0.0015` ETH cho người thuê, chuyển `0.0005` ETH cho chủ nhà, kết
     thúc hợp đồng.
   - **Khiếu nại (demo trọng tài + multisig)**: **[B] Người thuê** → bấm **Khiếu
     nại** → trạng thái chuyển "Đang tranh chấp". Cần ≥2 trọng tài độc lập bỏ phiếu
     **cùng 1 mức khấu trừ** mới tất toán (xem mục "Cấp thêm trọng tài" ở trên để
     cấp `ARBITER_ROLE` cho 1 ví thứ 2 trước khi demo). Mở thêm 1–2 trình duyệt là
     trọng tài → tab đó bấm **Bỏ phiếu trọng tài**, nhập cùng 1 mức (vd `0.0005`) ở
     mỗi trình duyệt → khi đủ số phiếu, hợp đồng tự động tất toán ngay lập tức,
     không cần ai bấm thêm nút nào khác.
7. Mở tab *Lịch sử* (ở mọi trình duyệt đều thấy giống nhau, vì đọc chung 1
   blockchain) → bấm vào từng dòng để xem chi tiết giao dịch (ví gửi/nhận, thời
   gian thật, số tiền, mã giao dịch).

**Điểm nhấn chống gian lận** (nói khi demo): mở thêm 1 ví thứ ba (không phải chủ nhà,
không phải trọng tài), thử trả tiền thuê hộ, tự bỏ phiếu trọng tài khi không có
`ARBITER_ROLE`, hoặc đề xuất tất toán khi chưa bàn giao → hệ thống chặn ngay bằng lỗi
từ smart contract, không cần ai kiểm duyệt thủ công. Cũng có thể thử khấu trừ vượt quá
tiền cọc để thấy giao dịch bị từ chối.

**Phạt thanh toán trễ**: mặc định `rentPeriod` là 30 ngày thật nên không demo trực
tiếp trên Sepolia trong vài phút được — nhưng có thể chứng minh bằng bộ test tự động
(`npx hardhat test`, mục "Phạt thanh toán tre" dùng time-travel để mô phỏng quá hạn),
hoặc deploy 1 bản Sepolia riêng cho demo với `rentPeriod` ngắn (vài phút) bằng file
tham số Ignition, vd `params.json`:
```json
{ "RentalSystemModule": { "rentPeriodSeconds": 300 } }
```
rồi `npx hardhat ignition deploy ignition/modules/RentalSystem.ts --network sepolia --build-profile default --parameters params.json`.

**Xác minh độc lập trên Etherscan** (chứng minh dữ liệu thật, không phải giả lập):
mở `https://sepolia.etherscan.io/address/<địa chỉ RentalManager>` → thấy toàn bộ
giao dịch vừa thực hiện, người gửi/nhận, số ETH — trùng khớp với những gì hiện trên
web.

---

## Chạy test

```bash
npx hardhat test
```

Bộ test (32 test case) kiểm tra: đặt cọc đúng/sai số tiền, tiền cọc do contract giữ, trả
tiền chuyển đúng chủ nhà, phạt trả trễ (dùng time-travel mô phỏng quá hạn), luồng đề
xuất/đồng ý/khiếu nại/trọng tài bỏ phiếu (multisig N-trong-M), và chặn các trường hợp
gian lận.

---

## Tài liệu dự án

- [docs/phan-tich-bai-toan.md](docs/phan-tich-bai-toan.md) — phân tích bài toán, đối tượng người dùng, phạm vi chức năng.
- [docs/lua-chon-token.md](docs/lua-chon-token.md) — vì sao cần token, so sánh ERC-20/721/1155, lý do tách 2 contract.
- [docs/kien-truc-va-usecase.md](docs/kien-truc-va-usecase.md) — sơ đồ use case, kiến trúc hệ thống, sequence diagram.
- [docs/thiet-ke-du-lieu.md](docs/thiet-ke-du-lieu.md) — struct/enum/event/hàm của 2 smart contract.
- [docs/gioi-han-va-rui-ro.md](docs/gioi-han-va-rui-ro.md) — giới hạn hiện tại, rủi ro bảo mật, hướng phát triển.
- [docs/bao-mat-slither.md](docs/bao-mat-slither.md) — kết quả chạy Slither (và sự cố tương thích gặp phải), rà soát bảo mật thủ công thay thế.
- [docs/production-checklist.md](docs/production-checklist.md) — checklist trước khi lên production/mainnet thật, ghi rõ hạng mục nào chưa làm.
- [docs/bao-cao-ket-qua.md](docs/bao-cao-ket-qua.md) — báo cáo kết quả tổng hợp: chức năng đã làm, kết quả test, kết quả deploy, giới hạn.
- [docs/phan-cong-cong-viec.md](docs/phan-cong-cong-viec.md) — phân công công việc.
- [docs/nhat-ky-su-dung-ai.md](docs/nhat-ky-su-dung-ai.md) — nhật ký sử dụng công cụ AI trong quá trình làm đồ án.

## Giới hạn & hướng phát triển

Cả 3 chức năng nâng cao theo đề bài đã triển khai: cơ chế trọng tài khi tranh chấp,
phạt thanh toán trễ, và multisig cho việc giải ngân tiền cọc (`ARBITER_ROLE` +
đếm phiếu N-trong-M on-chain, thay cho `TimelockController` được đề xuất ban đầu — đơn
giản hơn, không cần contract phụ trợ). Giới hạn còn lại (time lock cho quyết định
trọng tài, multisig cho ví admin, audit độc lập...) — xem chi tiết tại
[docs/gioi-han-va-rui-ro.md](docs/gioi-han-va-rui-ro.md).
