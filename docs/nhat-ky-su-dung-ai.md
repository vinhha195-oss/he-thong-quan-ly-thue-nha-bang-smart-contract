# Nhật ký sử dụng công cụ AI

**Công cụ**: Claude Code (Anthropic), mô hình Claude Sonnet 5, chạy trong VSCode.
**Cách dùng**: AI được dùng như một lập trình viên cặp đôi (pair-programmer) trực tiếp
viết code/tài liệu theo yêu cầu, con người (tôi) đọc, kiểm tra, chạy thử, và **chủ động
sửa hướng đi của AI** khi phát hiện đi lệch — không copy-paste mù quáng. Các mốc sửa
hướng quan trọng được ghi rõ ở mục 2 và 4 bên dưới.

## 1. Giai đoạn 1 — Xây dựng khung dự án ban đầu

**Yêu cầu đưa cho AI**: xây web quản lý thuê nhà bằng smart contract, tách rõ UI và BE
để có thể thiết kế giao diện độc lập bằng dữ liệu giả trước khi có contract thật.

**AI thực hiện**: đề xuất và code kiến trúc service layer (`RentalService` là interface
chung, `MockRentalService` dùng dữ liệu giả, `ChainRentalService` gọi contract thật qua
ethers.js) để component UI không biết mình đang chạy mock hay chain thật; viết smart
contract `RentalManager.sol` (khi đó là một contract duy nhất) với đầy đủ 8 chức năng
tối thiểu; viết test Hardhat/Chai; viết tài liệu phân tích bài toán, kiến trúc, thiết kế
dữ liệu.

**Con người kiểm tra**: đọc lại kiến trúc tách UI/BE, xác nhận hợp lý trước khi cho AI
tiếp tục sang các phần khác.

## 2. Giai đoạn 2 — Hỗ trợ deploy Vercel & Sepolia testnet

**Yêu cầu**: hướng dẫn deploy frontend lên Vercel với auto-deploy khi commit; hướng dẫn
tạo ví MetaMask, lấy RPC URL (Alchemy), lấy SepETH từ faucet, deploy thật lên Sepolia.

**AI thực hiện**: hướng dẫn từng bước qua các màn hình cụ thể (Alchemy, MetaMask,
faucet) dựa trên ảnh chụp màn hình người dùng gửi.

**Điểm can thiệp bảo mật quan trọng**: trong lúc thao tác, người dùng vô tình dán
**private key** vào ô "Wallet Address" của một faucet. AI phát hiện, cảnh báo rõ ràng
(⚠️), giải thích khác biệt giữa private key và địa chỉ ví công khai, và khuyến nghị tạo
ví mới thay vì tiếp tục dùng ví có khả năng đã lộ khoá — đây là một ví dụ AI **chủ động
ngăn một hành động có rủi ro bảo mật thật**, không chỉ làm theo yêu cầu.

## 3. Giai đoạn 3 — Rà soát lại theo quy trình chuẩn (mốc sửa hướng lớn nhất)

**Bối cảnh**: được cung cấp 6 tài liệu mô tả quy trình chuẩn xây dựng ứng dụng
blockchain dựa trên token (minh hoạ bằng ví dụ "quản lý chứng chỉ NFT"). Yêu cầu: rà
soát xem đề tài thuê nhà đã đi đúng quy trình 0–5 hay chưa.

**Sai sót của AI cần được sửa**: AI hiểu nhầm ban đầu và **bắt đầu xây một dự án mới,
tách biệt** để "quản lý chứng chỉ NFT" — đúng theo ví dụ minh hoạ trong tài liệu, nhưng
sai với ý định thật của người dùng (ví dụ minh hoạ không phải đề tài phải làm).

**Sửa hướng bởi con người**: người dùng chỉ rõ — 6 tài liệu là **quy trình chung**, ví
dụ chứng chỉ NFT chỉ minh hoạ cách áp dụng quy trình, **không phải đề tài cần làm**; yêu
cầu thật là *áp dụng quy trình đó vào đúng đề tài thuê nhà đang có*, không tạo dự án
song song. Đây là minh chứng rõ nhất trong toàn bộ quá trình về việc con người phải đọc
kỹ và chặn lại khi AI đi sai hướng, thay vì để AI tự quyết định phạm vi công việc.

**AI điều chỉnh sau khi được sửa**: rà soát lại `RentalManager.sol` so với quy trình,
xác định lệch lớn nhất là chưa dùng chuẩn token nào (không ERC-20/721/1155) và chưa tách
token contract khỏi business contract — lập kế hoạch 5 phase để khắc phục (trình bày cho
người dùng duyệt trước khi code, qua chế độ Plan Mode).

## 4. Giai đoạn 4 — Quyết định phạm vi công việc (do con người chọn)

AI đặt câu hỏi rõ ràng để con người quyết định phạm vi thay vì tự đoán:

- Có làm luôn Bước 4 (backend indexer + Slither + checklist production) trong lần này
  không, hay để sau? → **Người dùng chọn: làm luôn.**
- Giữ Hardhat 2/JavaScript hay chuyển hẳn sang Hardhat 3 + TypeScript để bám sát 100%
  công cụ trong tài liệu mẫu? → **Người dùng chọn: chuyển sang Hardhat 3 + TypeScript.**

## 5. Giai đoạn 5 — Thực thi kế hoạch 5 phase

**AI thực hiện** (đã được duyệt kế hoạch trước):

1. Migrate toolchain Hardhat 2/JS → Hardhat 3/TypeScript trước, xác minh 11 test cũ vẫn
   pass trên toolchain mới trước khi đổi kiến trúc contract (tách rủi ro đổi công cụ ra
   khỏi rủi ro đổi kiến trúc).
2. Tách `RentalAgreementToken.sol` (token) khỏi `RentalManager.sol` (nghiệp vụ), giữ
   nguyên chữ ký hàm/event công khai của `RentalManager` để frontend không cần sửa.
3. Viết tài liệu Bước 1 (lựa chọn loại token, so sánh ERC-20/721/1155).
4. Xây backend event indexer + REST API.
5. Cài Slither, bổ sung test bảo mật, viết checklist production.

**Lỗi kỹ thuật AI tự phát hiện và tự sửa trong lúc thực thi** (không cần con người chỉ
ra) — liệt kê để cho thấy AI có tự kiểm tra/tự sửa, không chỉ sinh code một lần rồi
dừng:

| Lỗi gặp phải | Cách AI phát hiện | Cách sửa |
|---|---|---|
| `changeEtherBalance` báo lỗi kiểu dữ liệu sau khi lên Hardhat 3 | Đọc source code `node_modules` của matcher để tìm chữ ký hàm mới | Thêm tham số `ethers` đầu tiên theo API mới |
| `mcopy` opcode not found khi build | Đọc thông báo lỗi, xác định đây là opcode của hardfork Cancun | Thêm `evmVersion: "cancun"` vào cấu hình solidity |
| Lỗi `mcopy` **vẫn xảy ra riêng khi deploy bằng Ignition** dù build/test đã qua | Đọc source code Hardhat để tìm ra hệ thống "build profiles" tách biệt | Thêm cờ `--build-profile default` vào lệnh deploy |
| Cài `better-sqlite3` thất bại (thiếu Visual Studio Build Tools trên máy) | Đọc log lỗi `node-gyp` | Đổi sang dùng `node:sqlite` (module có sẵn trong Node.js, không cần biên dịch native) |
| Slither không phân tích được project Hardhat 3 | Đọc traceback lỗi `crytic-compile`, thử nhiều đường vòng, cô lập bằng cách gọi thẳng `solc` để xác nhận lỗi nằm ở `solc`/`crytic-compile`, không phải ở contract | Không có cách khắc phục triệt để trong phạm vi thời gian cho phép — **AI ghi nhận trung thực giới hạn này** trong `bao-mat-slither.md` thay vì giả vờ đã chạy xong, và làm rà soát bảo mật thủ công thay thế |

Nguyên tắc được giữ xuyên suốt: **không đánh dấu ✓ giả** cho hạng mục chưa thực sự làm
được (vd Slither, Foundry fuzz test, audit độc lập) — ghi rõ trong
`production-checklist.md` đây là hạng mục còn thiếu.

## 6. Giai đoạn 6 — Demo end-to-end

**Yêu cầu**: chạy demo thực tế.

**AI thực hiện**: tự khởi động Hardhat local node, deploy contract, tạo giao dịch mẫu
thật trên chain, khởi động backend (indexer + REST API), khởi động frontend, dùng trình
duyệt headless (Playwright) để chụp màn hình và kiểm tra không có lỗi console — chứng
minh toàn bộ hệ thống hoạt động cùng nhau thật sự, không chỉ code biên dịch được.

## 7. Giai đoạn 7 — Cập nhật tài liệu & hoàn thiện sản phẩm nộp bài

**Yêu cầu**: cập nhật lại tài liệu phân tích bài toán cho khớp với những gì đã build
(vì tài liệu gốc viết trước khi tách token/backend); liệt kê lại toàn bộ cấu trúc thư
mục và đối chiếu với danh sách sản phẩm cần nộp; hoàn thành các tài liệu còn thiếu (báo
cáo kết quả, phân công công việc, nhật ký sử dụng AI này).

**AI thực hiện**: cập nhật `phan-tich-bai-toan.md`, liệt kê cây thư mục đầy đủ và đối
chiếu với yêu cầu đề bài, viết `bao-cao-ket-qua.md`, `phan-cong-cong-viec.md`, và tài
liệu này.

## 8. Đánh giá mức độ can thiệp của con người

- AI **không** được để tự quyết định phạm vi hay kiến trúc quan trọng mà không hỏi —
  hai lần dùng câu hỏi trực tiếp (Giai đoạn 4) để con người chọn thay vì AI tự đoán.
- Có **một lần AI hiểu sai nhiệm vụ** (Giai đoạn 3) và bị con người sửa lại bằng phản
  hồi trực tiếp, rõ ràng — đây là bằng chứng cho thấy kết quả cuối cùng có sự giám sát
  và chỉnh sửa của con người, không phải chấp nhận nguyên si output đầu tiên của AI.
  Toàn bộ nội dung tin nhắn sửa hướng gốc được lưu trong lịch sử làm việc, không chỉnh
  sửa lại ở đây.
- Mọi lỗi kỹ thuật phát sinh trong lúc code (bảng ở mục 5) đều được AI tự phát hiện qua
  đọc log lỗi/đọc source code thư viện, không đoán mò; con người xác nhận bằng cách chạy
  lại test (`npx hardhat test`) sau mỗi lần sửa để chắc chắn không hồi quy.
- Giới hạn thật của công cụ (Slither không chạy được) được ghi nhận trung thực thay vì
  che giấu — coi đây là nguyên tắc bắt buộc xuyên suốt dự án.
