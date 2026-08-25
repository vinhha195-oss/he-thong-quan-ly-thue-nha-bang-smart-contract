import { Contract, Interface, JsonRpcProvider, type Log } from "ethers";
import { MANAGER_ABI } from "./abi.js";
import { config } from "./config.js";
import { db } from "./db.js";

const STATE_ID = `rental-indexer:${config.managerAddress.toLowerCase()}`;
const BUSINESS_EVENTS = new Set([
  "PropertyListed",
  "Rented",
  "RentPaid",
  "HandoverConfirmed",
  "SettlementProposed",
  "DisputeRaised",
  "DisputeVoteCast",
  "LeaseEnded",
  "ListingCancelled",
]);

const provider = new JsonRpcProvider(config.rpcUrl);
const manager = new Contract(config.managerAddress, MANAGER_ABI, provider);
const managerInterface = new Interface(MANAGER_ABI);

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(jsonValue);
  }
  return value;
}

/** Ghi lai trang thai hien tai cua property (doc lai on-chain, khong suy dien tu event). */
async function upsertProperty(
  propertyId: bigint,
  updatedBlock: number,
): Promise<void> {
  const p = await manager.getProperty(propertyId);

  db.prepare(
    `
    INSERT INTO properties (
      id, landlord, title, location, monthly_rent, deposit,
      status, tenant, deposit_held, started_at, rent_paid_count, image_cid, note,
      next_due_date, proposed_deduction, settlement_proposed,
      updated_block, updated_at
    )
    VALUES (
      @id, @landlord, @title, @location, @monthlyRent, @deposit,
      @status, @tenant, @depositHeld, @startedAt, @rentPaidCount, @imageCid, @note,
      @nextDueDate, @proposedDeduction, @settlementProposed,
      @updatedBlock, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      landlord = excluded.landlord,
      title = excluded.title,
      location = excluded.location,
      monthly_rent = excluded.monthly_rent,
      deposit = excluded.deposit,
      status = excluded.status,
      tenant = excluded.tenant,
      deposit_held = excluded.deposit_held,
      started_at = excluded.started_at,
      rent_paid_count = excluded.rent_paid_count,
      image_cid = excluded.image_cid,
      note = excluded.note,
      next_due_date = excluded.next_due_date,
      proposed_deduction = excluded.proposed_deduction,
      settlement_proposed = excluded.settlement_proposed,
      updated_block = excluded.updated_block,
      updated_at = datetime('now')
    `,
  ).run({
    id: Number(propertyId),
    landlord: p.landlord,
    title: p.title,
    location: p.location,
    monthlyRent: p.monthlyRent.toString(),
    deposit: p.deposit.toString(),
    status: Number(p.status),
    tenant: p.tenant,
    depositHeld: p.depositHeld.toString(),
    startedAt: p.startedAt.toString(),
    rentPaidCount: Number(p.rentPaidCount),
    imageCid: p.imageCID,
    note: p.note,
    nextDueDate: p.nextDueDate.toString(),
    proposedDeduction: p.proposedDeduction.toString(),
    settlementProposed: p.settlementProposed ? 1 : 0,
    updatedBlock,
  });
}

type ProcessedEvent = {
  propertyId: bigint;
  blockNumber: number;
  eventName: string;
};

/** Ghi event vao blockchain_events (idempotent nho UNIQUE(tx_hash, log_index)). */
function processLog(log: Log): ProcessedEvent | null {
  let parsed;
  try {
    parsed = managerInterface.parseLog(log);
  } catch {
    return null;
  }
  if (!parsed || !BUSINESS_EVENTS.has(parsed.name)) {
    return null;
  }

  // Tat ca event nghiep vu deu co "id" (property id) la tham so dau tien.
  const propertyId = parsed.args[0] as bigint;

  const payload = Object.fromEntries(
    parsed.fragment.inputs.map((input, index) => [
      input.name || String(index),
      jsonValue(parsed!.args[index]),
    ]),
  );

  const result = db
    .prepare(
      `
      INSERT OR IGNORE INTO blockchain_events (
        contract_address, transaction_hash, log_index, block_number,
        block_hash, event_name, property_id, payload, processed_at
      )
      VALUES (
        @contractAddress, @txHash, @logIndex, @blockNumber,
        @blockHash, @eventName, @propertyId, @payload, datetime('now')
      )
      `,
    )
    .run({
      contractAddress: config.managerAddress.toLowerCase(),
      txHash: log.transactionHash,
      logIndex: log.index,
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      eventName: parsed.name,
      propertyId: Number(propertyId),
      payload: JSON.stringify(payload),
    });

  // Neu event da ton tai (result.changes === 0), khong can cap nhat lai property.
  if (result.changes === 0) {
    return null;
  }

  return { propertyId, blockNumber: log.blockNumber, eventName: parsed.name };
}

async function processBlockRange(
  fromBlock: number,
  toBlock: number,
): Promise<void> {
  const logs = await provider.getLogs({
    address: config.managerAddress,
    fromBlock,
    toBlock,
  });

  logs.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);

  for (const log of logs) {
    const processed = processLog(log);
    if (processed) {
      await upsertProperty(processed.propertyId, processed.blockNumber);
      console.log(
        `Processed ${processed.eventName} block=${processed.blockNumber} property=${processed.propertyId}`,
      );
    }
  }

  saveCursor(toBlock);
}

function getNextBlock(): number {
  const row = db
    .prepare(
      `SELECT last_processed_block FROM indexer_state WHERE id = ?`,
    )
    .get(STATE_ID) as { last_processed_block: number } | undefined;

  if (!row) {
    return config.deploymentBlock;
  }
  return row.last_processed_block + 1;
}

function saveCursor(blockNumber: number): void {
  db.prepare(
    `
    INSERT INTO indexer_state (id, last_processed_block, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      last_processed_block = excluded.last_processed_block,
      updated_at = datetime('now')
    `,
  ).run(STATE_ID, blockNumber);
}

async function main(): Promise<void> {
  console.log("Rental event indexer started.");
  console.log("Manager:", config.managerAddress);
  console.log("DB file:", config.dbFile);

  while (true) {
    try {
      const latestBlock = await provider.getBlockNumber();
      const safeBlock = latestBlock - config.confirmations;
      const fromBlock = getNextBlock();

      if (safeBlock < fromBlock) {
        await wait(config.pollIntervalMs);
        continue;
      }

      const toBlock = Math.min(
        fromBlock + config.blockBatchSize - 1,
        safeBlock,
      );
      console.log(`Scanning ${fromBlock} -> ${toBlock}`);
      await processBlockRange(fromBlock, toBlock);
    } catch (error) {
      console.error("Indexer error:", error);
      await wait(config.pollIntervalMs);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
