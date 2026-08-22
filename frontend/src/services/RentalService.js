import { CONTRACT_ABI } from "../config.js";
import { ChainRentalService } from "./ChainRentalService.js";
import { MockRentalService } from "./MockRentalService.js";

/**
 * @typedef {Object} Property
 * @property {number} id
 * @property {string} landlord
 * @property {string} title
 * @property {string} location
 * @property {bigint} monthlyRent  - wei
 * @property {bigint} deposit      - wei
 * @property {number} status       - 0 Listed, 1 Active, 2 HandedOver, 3 Ended
 * @property {string} tenant
 * @property {bigint} depositHeld  - wei
 * @property {number} rentPaidCount
 * @property {string} imageCID     - CID/URL anh phong tren IPFS, co the rong
 * @property {string} note         - ghi chu them cua chu nha, co the rong
 */

/**
 * @typedef {Object} HistoryEvent
 * @property {number} block
 * @property {string} txHash
 * @property {number} timestamp  - unix seconds
 * @property {string} type       - nhan hien thi (vd "Đặt cọc")
 * @property {number} id         - id tai san lien quan
 * @property {string|null} from
 * @property {string|null} to
 * @property {bigint|null} amount - wei, null neu su kien khong chuyen tien
 * @property {string} detail      - chuoi rut gon hien trong bang
 * @property {Object} extra       - du lieu rieng theo tung loai su kien (xem tung service)
 */

/**
 * "Interface" ma moi RentalService (mock hoac chain that) phai cai dat.
 * UI (components/*) chi duoc phep phu thuoc vao cac phuong thuc nay,
 * khong duoc goi ethers/window.ethereum truc tiep.
 *
 * @typedef {Object} RentalService
 * @property {boolean} isMock
 * @property {() => Promise<string>} connect - yeu cau ket noi vi, tra ve dia chi dang chon
 * @property {() => string|null} getAccount - dia chi dang ket noi hien tai (cache, khong async)
 * @property {(cb: (addr: string|null) => void) => (() => void)} onAccountsChanged - dang ky lang nghe doi tai khoan, tra ve ham huy dang ky
 * @property {() => Promise<Property[]>} loadProperties
 * @property {() => Promise<HistoryEvent[]>} loadHistory
 * @property {(input: {title: string, location: string, rent: string, deposit: string, imageCID?: string, note?: string}) => Promise<void>} listProperty
 * @property {(property: Property) => Promise<void>} rentProperty
 * @property {(property: Property) => Promise<void>} payRent
 * @property {(property: Property) => Promise<void>} confirmHandover
 * @property {(property: Property, deductEth: string) => Promise<void>} endLease
 */

let cachedService = null;

/**
 * Chon service theo VITE_USE_MOCK:
 *  - "true"  -> luon dung mock (khong can vi/chain)
 *  - "false" -> luon dung chain that (ethers + MetaMask)
 *  - khac / khong dat (auto) -> mock khi chua co ABI (chua deploy), nguoc lai dung chain
 * @returns {RentalService}
 */
export function getRentalService() {
  if (cachedService) return cachedService;

  const mode = (import.meta.env.VITE_USE_MOCK ?? "auto").toLowerCase();
  const useMock = mode === "true" ? true : mode === "false" ? false : CONTRACT_ABI.length === 0;

  cachedService = useMock ? new MockRentalService() : new ChainRentalService();
  return cachedService;
}
