// scripts/initDb.js
// Wipes and recreates the development database with the current schema.
// Only run this in development. Never run it on production data.

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const db = require("../db");
const { createCurrentSchema } = require("./schema.js");

const DATA_DIR = path.join(__dirname, "..", "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("Created data directory");
}

db.close();

for (const file of [DB_PATH, `${DB_PATH}-shm`, `${DB_PATH}-wal`]) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

const freshDb = new Database(DB_PATH);
freshDb.pragma("journal_mode = WAL");
freshDb.pragma("foreign_keys = ON");

console.log("Creating tables...");
createCurrentSchema(freshDb, { markMigrations: true });
console.log("Tables created");

console.log("Seeding test data...");

const issuerId = freshDb.prepare(`
  INSERT INTO issuer (
    firm_name, sub_heading, address, phone, email,
    pan, gstin, is_gst_enabled,
    invoice_prefix, invoice_counter,
    quotation_prefix, quotation_counter
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  "Test Firm Pvt Ltd",
  "Consulting & Services",
  "123 Main Street, Mumbai, Maharashtra",
  "9876543210",
  "test@firm.com",
  "ABCDE1234F",
  "27ABCDE1234F1Z5",
  1,
  "INV-",
  1,
  "QUO-",
  1,
).lastInsertRowid;

freshDb.prepare(`
  INSERT INTO prefix_history (issuer_id, doc_type, prefix, counter_start)
  VALUES (?, ?, ?, ?)
`).run(issuerId, "INVOICE", "INV-", 1);

freshDb.prepare(`
  INSERT INTO prefix_history (issuer_id, doc_type, prefix, counter_start)
  VALUES (?, ?, ?, ?)
`).run(issuerId, "QUOTATION", "QUO-", 1);

freshDb.prepare(`
  INSERT INTO bank (
    issuer_id, account_holder_name, bank_name,
    account_number, account_type, ifsc_code, branch
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  issuerId,
  "Test Firm Pvt Ltd",
  "HDFC Bank",
  "1234567890",
  "Current",
  "HDFC0001234",
  "Mumbai Main",
);

const clientId = freshDb.prepare(`
  INSERT INTO client (name, address, phone, email, gstin)
  VALUES (?, ?, ?, ?, ?)
`).run(
  "Sample Client Co",
  "456 Client Road, Pune, Maharashtra",
  "9123456780",
  "client@sample.com",
  "27XYZAB1234C1Z1",
).lastInsertRowid;

console.log(`Seeded issuer id ${issuerId}, client id ${clientId}`);
console.log("Use these IDs in testRoutes.js:");
console.log(`ISSUER_ID = ${issuerId}`);
console.log(`CLIENT_ID = ${clientId}`);

freshDb.close();
console.log("Database ready");
