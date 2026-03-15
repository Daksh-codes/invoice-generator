// scripts/initDb.js
// Wipes and recreates the database from scratch with all current schema.
// This is the single source of truth — no separate migrations needed for fresh installs.
// Only run this in development. Never on production with real data.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const DB_PATH = path.join(DATA_DIR, "app.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
  console.log("📁 Created data/ directory");
}

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log("🗑️  Deleted existing database");
}

const db = require("../db");

console.log("🔄 Creating tables...");

db.exec(`
  CREATE TABLE IF NOT EXISTS issuer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firm_name TEXT NOT NULL,
    sub_heading TEXT,
    logo TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    pan TEXT,
    gstin TEXT,
    is_gst_enabled INTEGER DEFAULT 0,
    signature_image TEXT,
    invoice_prefix TEXT NOT NULL,
    invoice_counter INTEGER DEFAULT 1,
    quotation_prefix TEXT NOT NULL,
    quotation_counter INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_id INTEGER NOT NULL,
    account_holder_name TEXT,
    bank_name TEXT,
    account_number TEXT,
    account_type TEXT,
    ifsc_code TEXT,
    branch TEXT,
    upi_qr TEXT,
    FOREIGN KEY (issuer_id) REFERENCES issuer(id)
  );

  CREATE TABLE IF NOT EXISTS client (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT
  );

  CREATE TABLE IF NOT EXISTS invoice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    doc_type TEXT DEFAULT 'INVOICE',
    status TEXT CHECK(status IN ('draft', 'active', 'void', 'converted')) DEFAULT 'active',
    converted_from_id INTEGER REFERENCES invoice(id),
    bill_number TEXT NOT NULL,
    bill_date TEXT NOT NULL,
    payment_terms TEXT,
    due_date TEXT,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    tax_total REAL DEFAULT 0,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    is_igst INTEGER DEFAULT 0,
    total REAL NOT NULL,
    total_in_words TEXT NOT NULL,
    notes TEXT,
    paid_amount REAL DEFAULT 0,
    payment_status TEXT CHECK(payment_status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issuer_id) REFERENCES issuer(id),
    FOREIGN KEY (client_id) REFERENCES client(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    hsn_code TEXT,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoice(id)
  );

  CREATE TABLE IF NOT EXISTS prefix_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_id INTEGER NOT NULL,
    doc_type TEXT NOT NULL CHECK(doc_type IN ('INVOICE', 'QUOTATION')),
    prefix TEXT NOT NULL,
    counter_start INTEGER NOT NULL,
    counter_end INTEGER,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issuer_id) REFERENCES issuer(id)
  );

  -- migrations table still exists so the migration runner on existing DBs
  -- knows which versions have been applied. For fresh DBs we mark all as done.
  CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY
  );

  INSERT OR IGNORE INTO migrations (version) VALUES (1);
  INSERT OR IGNORE INTO migrations (version) VALUES (2);
  INSERT OR IGNORE INTO migrations (version) VALUES (3);
`);

console.log("✅ Tables created");

// ── Seed data ──────────────────────────────────────────────────────────────
console.log("🌱 Seeding test data...");

const issuerId = db.prepare(`
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

// Seed initial prefix history for the seeded issuer
db.prepare(`
  INSERT INTO prefix_history (issuer_id, doc_type, prefix, counter_start)
  VALUES (?, ?, ?, ?)
`).run(issuerId, "INVOICE", "INV-", 1);

db.prepare(`
  INSERT INTO prefix_history (issuer_id, doc_type, prefix, counter_start)
  VALUES (?, ?, ?, ?)
`).run(issuerId, "QUOTATION", "QUO-", 1);

db.prepare(`
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

const clientId = db.prepare(`
  INSERT INTO client (name, address, phone, email, gstin)
  VALUES (?, ?, ?, ?, ?)
`).run(
  "Sample Client Co",
  "456 Client Road, Pune, Maharashtra",
  "9123456780",
  "client@sample.com",
  "27XYZAB1234C1Z1",
).lastInsertRowid;

console.log(`✅ Seeded issuer (id: ${issuerId}), client (id: ${clientId})`);
console.log("\n📋 Use these IDs in testRoutes.js:");
console.log(`   ISSUER_ID = ${issuerId}`);
console.log(`   CLIENT_ID = ${clientId}`);

db.close();
console.log("\n✅ Database ready\n");