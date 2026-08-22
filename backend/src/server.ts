import cors from "cors";
import express from "express";
import { JsonRpcProvider } from "ethers";
import { config } from "./config.js";
import { db } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const provider = new JsonRpcProvider(config.rpcUrl);

app.get("/health", async (_request, response) => {
  const blockNumber = await provider.getBlockNumber();
  response.json({
    status: "ok",
    managerAddress: config.managerAddress,
    blockNumber,
  });
});

app.get("/api/properties", (_request, response) => {
  const rows = db.prepare("SELECT * FROM properties ORDER BY id").all();
  response.json(rows);
});

app.get("/api/properties/:id", (request, response) => {
  const row = db
    .prepare("SELECT * FROM properties WHERE id = ?")
    .get(request.params.id);

  if (!row) {
    response.status(404).json({ message: "Khong tim thay property" });
    return;
  }
  response.json(row);
});

app.get("/api/history/:id", (request, response) => {
  const rows = db
    .prepare(
      "SELECT * FROM blockchain_events WHERE property_id = ? ORDER BY block_number DESC, log_index DESC",
    )
    .all(request.params.id) as Array<Record<string, unknown>>;

  response.json(
    rows.map((row) => ({
      ...row,
      payload: JSON.parse(row.payload as string),
    })),
  );
});

app.listen(config.port, () => {
  console.log(`Rental backend API running on port ${config.port}`);
});
