const db = require('./db');

// Firm / Issuer
db.prepare(`
  CREATE TABLE IF NOT EXISTS issuer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firm_name TEXT NOT NULL,
    sub_heading TEXT,
    logo TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    pan TEXT,
    signature_image TEXT,
    invoice_prefix TEXT NOT NULL,
    invoice_counter INTEGER DEFAULT 1,
    quotation_prefix TEXT NOT NULL,
    quotation_counter INTEGER DEFAULT 1
  )
`).run();

// Bank Details
db.prepare(`
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
    
  )
`).run();

// Clients
db.prepare(`
  CREATE TABLE IF NOT EXISTS client (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    gst TEXT
  )
`).run();

// Invoices
db.prepare(`
  CREATE TABLE IF NOT EXISTS invoice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,

    bill_number TEXT NOT NULL,
    bill_date TEXT NOT NULL,
    payment_terms TEXT,
    due_date TEXT,

    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    total_in_words TEXT NOT NULL,

    paid_amount REAL DEFAULT 0,
    payment_status TEXT CHECK (payment_status IN ('unpaid','partial','paid')) DEFAULT 'unpaid',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (issuer_id) REFERENCES issuer(id),
    FOREIGN KEY (client_id) REFERENCES client(id)
  )
`).run();

// Invoice Items (Services)
db.prepare(`
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoice(id)
  )
`).run();

console.log("All tables created successfully");
