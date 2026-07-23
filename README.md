# Hệ thống quản lý thuê nhà bằng smart contract

Đồ án môn Chuỗi khối và ứng dụng. Hệ thống đưa quá trình đặt cọc, thanh toán tiền thuê
và tất toán hợp đồng lên blockchain, để smart contract giữ tiền cọc một cách khách quan
và ghi lại mọi giao dịch minh bạch, không thể chỉnh sửa.

## Công nghệ

- **Smart contract:** Solidity + OpenZeppelin (ReentrancyGuard)
- **Môi trường:** Hardhat (biên dịch, test, mạng blockchain local)
- **Giao diện:** ReactJS (Vite) + ethers.js, kết nối ví MetaMask

## Cấu trúc thư mục

```
rental-dapp/
├── contracts/RentalManager.sol      # Smart contract chính
├── scripts/deploy.js                # Deploy + tự ghi cấu hình sang frontend
├── test/RentalManager.test.js       # Bộ test (11 test case)
├── hardhat.config.js                # Mạng: localhost + sepolia (qua .env)
├── docs/                            # Phân tích bài toán, use case/kiến trúc,
│                                     # thiết kế dữ liệu, giới hạn & rủi ro bảo mật
└── frontend/                        # Giao diện web React (Vite)
    └── src/
        ├── config.js                 # Địa chỉ + ABI contract (tự sinh khi deploy)
        ├── mock/fixtures.js          # Dữ liệu mẫu cho chế độ mock
        ├── services/                 # Lớp "BE": RentalService (interface chung),
        │                             # ChainRentalService (ethers.js thật),
        │                             # MockRentalService (dữ liệu mẫu, không cần ví)
        ├── context/RentalContext.jsx # Nơi UI lấy state/gọi hành động
        ├── hooks/useRental.js
        ├── components/               # UI thuần, không biết gì về ethers/blockchain
        └── App.jsx
```

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
npx hardhat run scripts/deploy.js --network localhost
```

Lệnh này deploy contract và **tự động** ghi địa chỉ + ABI vào `frontend/src/config.js`
(bạn không phải copy-paste gì cả).

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
testnet thật (Sepolia):

1. Tạo file `.env` ở thư mục gốc từ mẫu có sẵn:
   ```bash
   cp .env.example .env
   ```
2. Điền `SEPOLIA_RPC_URL` (đăng ký miễn phí ở [Alchemy](https://www.alchemy.com/) hoặc
   [Infura](https://www.infura.io/), tạo app cho mạng Sepolia) và `PRIVATE_KEY` của
   **một ví test** — tuyệt đối không dùng ví có tiền thật.
3. Lấy ETH Sepolia miễn phí từ faucet, ví dụ https://sepoliafaucet.com.
4. Deploy:
   ```bash
   npm run deploy:sepolia
   ```
   Lệnh này ghi địa chỉ + ABI vào `frontend/src/config.js` giống hệt deploy local.
5. Đổi mạng MetaMask sang **Sepolia** (có sẵn trong danh sách mạng mặc định), rồi chạy
   `cd frontend && npm run dev` như bình thường.

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

## Kịch bản demo (5–10 phút)

1. **Chủ nhà (Account #0)** → tab *Đăng cho thuê* → nhập "Phòng Quận 1", tiền thuê `1`, cọc `2` → **Đăng tài sản**.
2. Chuyển MetaMask sang **Người thuê (Account #1)** → tab *Danh sách phòng* → **Đặt cọc & thuê**.
   Chú ý: 2 ETH bị khóa trong hợp đồng, không vào ví chủ nhà.
3. Vẫn là người thuê → **Trả tiền thuê** (1 ETH chảy thẳng sang ví chủ nhà).
4. Người thuê → **Xác nhận bàn giao**.
5. Chuyển về **Chủ nhà** → **Tất toán cọc & kết thúc**, nhập khấu trừ `0.5` →
   hệ thống tự hoàn 1.5 ETH cho người thuê, chuyển 0.5 ETH cho chủ nhà.
6. Mở tab *Lịch sử* → toàn bộ giao dịch hiện ra, đọc trực tiếp từ blockchain.

**Điểm nhấn chống gian lận** (nói khi demo): thử để một tài khoản thứ ba trả tiền thuê,
hoặc khấu trừ vượt quá cọc → hệ thống chặn ngay. Luật hợp đồng được thực thi tự động.

---

## Chạy test

```bash
npx hardhat test
```

Bộ test kiểm tra: đặt cọc đúng/sai số tiền, tiền cọc do contract giữ, trả tiền chuyển đúng
chủ nhà, hoàn/khấu trừ cọc chính xác, và chặn các trường hợp gian lận.

---

## Tài liệu dự án

- [docs/phan-tich-bai-toan.md](docs/phan-tich-bai-toan.md) — phân tích bài toán, đối tượng người dùng, phạm vi chức năng.
- [docs/kien-truc-va-usecase.md](docs/kien-truc-va-usecase.md) — sơ đồ use case, kiến trúc hệ thống, sequence diagram.
- [docs/thiet-ke-du-lieu.md](docs/thiet-ke-du-lieu.md) — struct/enum/event/hàm của smart contract.
- [docs/gioi-han-va-rui-ro.md](docs/gioi-han-va-rui-ro.md) — giới hạn hiện tại, rủi ro bảo mật, hướng phát triển.

## Giới hạn & hướng phát triển

Bản hiện tại để chủ nhà quyết mức khấu trừ cọc (có bước người thuê xác nhận bàn giao trước
để tăng công bằng). Hướng phát triển: cơ chế trọng tài khi tranh chấp, phạt thanh toán trễ,
và multisig cho việc giải ngân tiền cọc (thiết kế đề xuất dùng OpenZeppelin `AccessControl`
+ `TimelockController`) — xem chi tiết tại [docs/gioi-han-va-rui-ro.md](docs/gioi-han-va-rui-ro.md).
