const db = require('./db')

// issuer
db.prepare(`
  CREATE TABLE IF NOT EXISTS issuer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    invoice_prefix TEXT NOT NULL,
    invoice_counter INTEGER DEFAULT 1,
    quotation_prefix TEXT NOT NULL,
    quotation_counter INTEGER DEFAULT 1
  )
`).run();

// bank
db.prepare(`
  CREATE TABLE IF NOT EXISTS bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    account_number TEXT,
    ifsc_code TEXT
  )
`).run();

// client
db.prepare(`
  CREATE TABLE IF NOT EXISTS client (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )
`).run();

// invoice
db.prepare(`
  CREATE TABLE IF NOT EXISTS invoice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    payment_status TEXT 
      CHECK (payment_status IN ('unpaid','partial','paid')) 
      DEFAULT 'unpaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (issuer_id) REFERENCES issuer(id),
    FOREIGN KEY (client_id) REFERENCES client(id)
  )
`).run();
