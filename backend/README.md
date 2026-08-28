# Backend — Event indexer + REST API (Bước 4 của quy trình)

Nghe event từ `RentalManager` trên blockchain, ghi lại vào **SQLite** (không cần
Docker/PostgreSQL), rồi expose REST API để tra cứu nhanh mà không phải gọi lại
blockchain mỗi lần. Blockchain vẫn là **nguồn dữ liệu có thẩm quyền** — SQLite chỉ là
lớp chỉ mục.

> Dùng SQLite thay vì PostgreSQL vì máy phát triển không có Docker/PostgreSQL cài sẵn.
> Đây là "Mức 5" trong lộ trình nâng cấp mà tài liệu quy trình gợi ý (làm trước khi
> chuyển sang PostgreSQL ở "Mức 6"), không phải đi chệch hướng.

## Chạy

1. Deploy contract trước (xem README ở thư mục gốc), lấy địa chỉ `RentalManager` trong
   `ignition/deployments/chain-<id>/deployed_addresses.json`.
2. Cài đặt:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
3. Điền `.env`: `RPC_URL` (mặc định `http://127.0.0.1:8545` cho local),
   `MANAGER_ADDRESS` (địa chỉ vừa lấy ở bước 1).
4. Chạy indexer (terminal riêng, để chạy liên tục):
   ```bash
   npm run dev:indexer
   ```
5. Chạy REST API (terminal khác):
   ```bash
   npm run dev:api
   ```
6. Kiểm tra:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/api/properties
   curl http://localhost:3001/api/properties/1
   curl http://localhost:3001/api/history/1
   ```

## Cấu trúc

- `src/config.ts` — đọc biến môi trường.
- `src/db.ts` — mở file SQLite bằng module `node:sqlite` tích hợp sẵn trong Node.js
  (không cần biên dịch native như `better-sqlite3`), tạo bảng nếu chưa có.
- `src/abi.ts` — ABI tối thiểu của `RentalManager` (9 event + `getProperty`: `PropertyListed`,
  `Rented`, `RentPaid`, `HandoverConfirmed`, `SettlementProposed`, `DisputeRaised`,
  `DisputeVoteCast`, `LeaseEnded`, `ListingCancelled`).
- `src/indexer.ts` — quét block theo con trỏ (`indexer_state.last_processed_block`),
  chờ `CONFIRMATIONS` block trước khi xử lý (tránh đọc phải block bị reorg), ghi event
  vào `blockchain_events` (idempotent nhờ `UNIQUE(transaction_hash, log_index)`), rồi
  đọc lại `getProperty()` on-chain để cập nhật bảng `properties` — không suy diễn dữ
  liệu từ tham số event, luôn lấy trạng thái thật mới nhất.
- `src/server.ts` — REST API Express (`/health`, `/api/properties`,
  `/api/properties/:id`, `/api/history/:id`).

## Giới hạn đã biết (xem thêm `docs/production-checklist.md` ở thư mục gốc)

- SQLite phù hợp cho demo/đồ án, **không** dùng cho production nhiều người viết đồng
  thời — production thật nên chuyển sang PostgreSQL (schema tương đương, đổi driver từ
  `better-sqlite3` sang `pg`).
- Không có cơ chế đối soát lại (reconciliation) khi phát hiện block bị đổi hash do reorg
  sâu hơn `CONFIRMATIONS` — chỉ giảm thiểu bằng cách chờ đủ số block xác nhận.
