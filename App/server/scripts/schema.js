const CURRENT_MIGRATION_VERSION = 9;

function createCurrentSchema(db, { markMigrations = false } = {}) {
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
      template TEXT DEFAULT 'with_logo',
      spacer_rows INTEGER DEFAULT 3,
      payment_mode TEXT,
      transaction_number TEXT,
      paid_date TEXT,
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

    CREATE TABLE IF NOT EXISTS payment_modes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      mode TEXT,
      transaction_number TEXT,
      payment_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
      ON payments(invoice_id);

    INSERT OR IGNORE INTO payment_modes (label) VALUES ('Cash'), ('UPI'), ('Bank Transfer');

    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY
    );
  `);

  if (markMigrations) {
    const markMigration = db.prepare(
      "INSERT OR IGNORE INTO migrations (version) VALUES (?)",
    );

    for (let version = 1; version <= CURRENT_MIGRATION_VERSION; version += 1) {
      markMigration.run(version);
    }
  }
}

module.exports = {
  CURRENT_MIGRATION_VERSION,
  createCurrentSchema,
};
