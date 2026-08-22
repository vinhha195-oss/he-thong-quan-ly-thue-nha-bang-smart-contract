import "dotenv/config";
import { getAddress } from "ethers";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Thieu bien moi truong ${name}`);
  }
  return value;
}

function positiveInteger(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} khong hop le`);
  }
  return value;
}

export const config = {
  rpcUrl: process.env.RPC_URL?.trim() || "http://127.0.0.1:8545",
  managerAddress: getAddress(required("MANAGER_ADDRESS")),
  deploymentBlock: positiveInteger("DEPLOYMENT_BLOCK", 0),
  confirmations: positiveInteger("CONFIRMATIONS", 1),
  blockBatchSize: positiveInteger("BLOCK_BATCH_SIZE", 500),
  pollIntervalMs: positiveInteger("POLL_INTERVAL_MS", 3000),
  dbFile: process.env.DB_FILE?.trim() || "./data/rental.sqlite3",
  port: positiveInteger("PORT", 3001),
} as const;
