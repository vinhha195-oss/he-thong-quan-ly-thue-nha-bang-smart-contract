# Use case & kiến trúc hệ thống

## 1. Sơ đồ use case

```mermaid
flowchart LR
    Landlord((Chủ nhà))
    Tenant((Người thuê))
    Arbiter((Trọng tài))

    subgraph RentalManager["Hệ thống quản lý thuê nhà (smart contract)"]
        UC1[Đăng tài sản cho thuê]
        UC2[Đặt cọc / kích hoạt hợp đồng]
        UC3[Trả tiền thuê định kỳ\n+ phạt nếu trễ hạn]
        UC4[Xác nhận bàn giao]
        UC5[Đề xuất / đồng ý tất toán cọc]
        UC5b[Khiếu nại khi không đồng ý]
        UC7[Bỏ phiếu xử lý tranh chấp\nmultisig N-trong-M]
        UC6[Xem lịch sử giao dịch]
    end

    Landlord --> UC1
    Landlord --> UC5
    Landlord --> UC6
    Tenant --> UC2
    Tenant --> UC3
    Tenant --> UC4
    Tenant --> UC5
    Tenant --> UC5b
    Tenant --> UC6
    Arbiter --> UC7
    UC5b -.-> UC7
```

## 2. Kiến trúc hệ thống

Điểm mấu chốt của bản refactor này: **UI (giao diện) và BE (logic dữ liệu/blockchain)
tách rời hoàn toàn qua một lớp "service"** có 2 cài đặt hoán đổi được — nhờ vậy nhóm có
thể dựng và kiểm tra toàn bộ giao diện bằng dữ liệu mẫu (`MockRentalService`) trước khi
contract được deploy, rồi chuyển sang blockchain thật (`ChainRentalService`) mà **không
sửa bất kỳ component UI nào**.

```mermaid
flowchart TB
    subgraph UI["UI — components/* (thuần React, không biết ethers)"]
        TopBar
        ModeBanner
        PropertyForm
        PropertyList & PropertyCard
        HistoryTable
    end

    Context["RentalContext (context/RentalContext.jsx)\nstate: account, properties, history, busy, toast, isArbiter\naction: connect, listProperty, rentProperty, payRent,\nconfirmHandover, proposeSettlement, acceptSettlement,\ndisputeSettlement, voteOnDispute"]

    Factory["getRentalService() — services/RentalService.js\nchọn service theo VITE_USE_MOCK + CONTRACT_ABI"]

    subgraph BE["BE — 2 cài đặt cùng interface RentalService"]
        Mock["MockRentalService\n(mock/fixtures.js, in-memory,\nmô phỏng require() của contract)"]
        Chain["ChainRentalService\n(ethers.js BrowserProvider + Contract)"]
    end

    MetaMask[[MetaMask]]
    Node[["Hardhat Local Node\n/ Sepolia testnet"]]
    Manager[["RentalManager.sol\n(nghiệp vụ, đã deploy)"]]
    Token[["RentalAgreementToken.sol\n(ERC-721 không chuyển nhượng)"]]

    UI --> Context
    Context --> Factory
    Factory --> Mock
    Factory --> Chain
    Chain --> MetaMask --> Node --> Manager
    Manager -- "mintAgreement() khi rentProperty" --> Token
```

Frontend chỉ gọi vào `RentalManager` (ABI/hàm/sự kiện giữ nguyên như trước khi tách
contract) — `RentalAgreementToken` là chi tiết triển khai nội bộ giữa 2 contract, không
lộ ra ngoài giao diện. Xem lý do tách 2 contract tại
[docs/lua-chon-token.md](./lua-chon-token.md).

## 3. Sequence diagram — các luồng nghiệp vụ chính

### 3.1. Đặt cọc & kích hoạt hợp đồng

```mermaid
sequenceDiagram
    actor Tenant as Người thuê
    participant UI as PropertyCard (UI)
    participant Ctx as RentalContext
    participant Svc as RentalService (Mock/Chain)
    participant SC as RentalManager.sol

    Tenant->>UI: Bấm "Đặt cọc & thuê"
    UI->>Ctx: rentProperty(property)
    Ctx->>Svc: rentProperty(property, {onPending})
    Svc->>SC: rentProperty(id) kèm value = deposit
    SC-->>SC: require: đang trống, không phải chủ nhà,\nđúng số tiền cọc
    SC-->>SC: emit Rented + tiền cọc giữ tại contract
    SC->>SC: mintAgreement(tenant, id) trên RentalAgreementToken\n(tokenId = id, không chuyển nhượng)
    SC-->>Svc: resolve
    Svc-->>Ctx: resolve
    Ctx->>Svc: loadProperties() + loadHistory()
    Ctx-->>UI: cập nhật state -> re-render
```

### 3.2. Trả tiền thuê định kỳ

```mermaid
sequenceDiagram
    actor Tenant as Người thuê
    participant Ctx as RentalContext
    participant Svc as RentalService
    participant SC as RentalManager.sol
    actor Landlord as Chủ nhà

    Tenant->>Svc: quotePayRent(property) — tính co bi tre han khong
    Svc-->>Tenant: {total, penalty, isLate}
    Tenant->>Ctx: payRent(property)
    Ctx->>Svc: payRent(property, {onPending})
    Svc->>SC: payRent(id) kèm value = monthlyRent (+ phạt nếu quá nextDueDate)
    SC-->>SC: require: hợp đồng Active, đúng người thuê,\nđúng tổng tiền (gốc + phạt nếu trễ)
    SC->>Landlord: chuyển thẳng ETH cho chủ nhà
    SC-->>Svc: emit RentPaid(..., latePenalty, ...)
```

### 3.3. Xác nhận bàn giao & tất toán cọc (có trọng tài multisig khi tranh chấp)

```mermaid
sequenceDiagram
    actor Tenant as Người thuê
    actor Landlord as Chủ nhà
    actor Arb as Trọng tài (ARBITER_ROLE)
    participant Ctx as RentalContext
    participant Svc as RentalService
    participant SC as RentalManager.sol

    Tenant->>Ctx: confirmHandover(property)
    Ctx->>Svc: confirmHandover(property)
    Svc->>SC: confirmHandover(id) -> status = HandedOver

    Landlord->>Ctx: proposeSettlement(property, deductEth)
    Ctx->>Svc: proposeSettlement(property, deductEth)
    Svc->>SC: proposeSettlement(id, deductAmount)
    SC-->>SC: require: đã bàn giao, đúng chủ nhà,\nkhấu trừ <= tiền cọc đang giữ
    SC-->>Svc: emit SettlementProposed

    alt Người thuê đồng ý
        Tenant->>Ctx: acceptSettlement(property)
        Ctx->>Svc: acceptSettlement(property)
        Svc->>SC: acceptSettlement(id)
        SC->>Landlord: chuyển phần khấu trừ
        SC->>Tenant: hoàn phần còn lại
        SC-->>Svc: emit LeaseEnded -> status = Ended
    else Người thuê khiếu nại
        Tenant->>Ctx: disputeSettlement(property)
        Ctx->>Svc: disputeSettlement(property)
        Svc->>SC: disputeSettlement(id) -> status = Disputed
        SC-->>Svc: emit DisputeRaised

        loop Từng trọng tài bỏ phiếu
            Arb->>Ctx: voteOnDispute(property, deductEth)
            Ctx->>Svc: voteOnDispute(property, deductEth)
            Svc->>SC: voteOnDispute(id, deductAmount)
            SC-->>SC: require: co ARBITER_ROLE,\nchua vote lan nao cho tranh chap nay
            SC-->>Svc: emit DisputeVoteCast
        end
        Note over SC: Khi đủ arbiterApprovalsRequired phiếu\ncùng 1 mức -> tự động tất toán (_settle)
        SC->>Landlord: chuyển phần khấu trừ
        SC->>Tenant: hoàn phần còn lại
        SC-->>Svc: emit LeaseEnded -> status = Ended
    end
```

## 4. Lựa chọn service (mock ↔ chain)

`getRentalService()` (frontend/src/services/RentalService.js) quyết định dựa trên biến
môi trường `VITE_USE_MOCK` (đọc từ `frontend/.env`, xem `frontend/.env.example`):

| `VITE_USE_MOCK` | Kết quả |
|---|---|
| `true` | Luôn dùng `MockRentalService` — không cần MetaMask/contract, phù hợp khi thiết kế UI. |
| `false` | Luôn dùng `ChainRentalService` — bắt buộc phải có MetaMask + contract đã deploy. |
| không đặt (`auto`, mặc định) | Tự dùng mock nếu `frontend/src/config.js` chưa có ABI (chưa chạy `npm run deploy`), ngược lại dùng chain thật. |
