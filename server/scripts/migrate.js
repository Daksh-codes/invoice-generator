// migrations.js
// Only runs on existing databases that were created before initDb.js had the full schema.
// Fresh databases created via initDb.js already have all columns — migrations are pre-marked done.

const migrations = [
  {
    version: 1,
    description: "Add status + converted_from_id to invoice table",
    up: (db) => {
      db.prepare(`
        ALTER TABLE invoice ADD COLUMN status TEXT
        CHECK(status IN ('draft', 'active', 'void', 'converted')) DEFAULT 'active'
      `).run();
      db.prepare(`
        ALTER TABLE invoice ADD COLUMN converted_from_id INTEGER REFERENCES invoice(id)
      `).run();
      db.prepare(`UPDATE invoice SET status = 'active' WHERE status IS NULL`).run();
    },
  },
  {
    version: 2,
    description: "Create prefix_history table and seed existing issuers",
    up: (db) => {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS prefix_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          issuer_id INTEGER NOT NULL,
          doc_type TEXT NOT NULL CHECK(doc_type IN ('INVOICE', 'QUOTATION')),
          prefix TEXT NOT NULL,
          counter_start INTEGER NOT NULL,
          counter_end INTEGER,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (issuer_id) REFERENCES issuer(id)
        )
      `).run();

      const issuers = db.prepare(
        "SELECT id, invoice_prefix, quotation_prefix FROM issuer"
      ).all();

      const insertHistory = db.prepare(`
        INSERT INTO prefix_history (issuer_id, doc_type, prefix, counter_start)
        VALUES (?, ?, ?, ?)
      `);

      for (const issuer of issuers) {
        insertHistory.run(issuer.id, "INVOICE", issuer.invoice_prefix, 1);
        insertHistory.run(issuer.id, "QUOTATION", issuer.quotation_prefix, 1);
      }
    },
  },
  {
    version: 3,
    description: "Add converted_from_id to invoice if missing (fix for DBs that skipped it)",
    up: (db) => {
      // Check if column already exists before adding — safe re-run
      const columns = db.prepare("PRAGMA table_info(invoice)").all();
      const exists = columns.some((c) => c.name === "converted_from_id");
      if (!exists) {
        db.prepare(
          "ALTER TABLE invoice ADD COLUMN converted_from_id INTEGER REFERENCES invoice(id)"
        ).run();
      }
    },
  },
  {
    version: 4,
    description: "Added invoice type  column and set default to with logo",
    up: (db) => {
      db.exec("ALTER TABLE invoice ADD COLUMN template TEXT DEFAULT 'with_logo'");
    },
  },
    {
    version: 5,
    description: "Added payment mode and paid date",
    up: (db) => {
      db.exec(`ALTER TABLE invoice ADD COLUMN payment_mode TEXT`);
      db.exec(`ALTER TABLE invoice ADD COLUMN paid_date TEXT`);
    },
  },
];

function runMigrations(db) {
  db.prepare(`CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)`).run();

  const applied = db.prepare(`SELECT version FROM migrations`).all().map((r) => r.version);
  const pending = migrations.filter((m) => !applied.includes(m.version));

  if (pending.length === 0) {
    console.log("✅ Database up to date, no migrations to run");
    return;
  }

  console.log(`🔄 Running ${pending.length} pending migration(s)...`);

  for (const migration of pending) {
    try {
      console.log(`  ⏳ Applying migration v${migration.version}: ${migration.description}`);
      migration.up(db);
      db.prepare(`INSERT INTO migrations (version) VALUES (?)`).run(migration.version);
      console.log(`  ✅ Migration v${migration.version} applied`);
    } catch (err) {
      console.error(`  ❌ Migration v${migration.version} failed:`, err.message);
      console.error("     Stopping — fix the error before restarting");
      process.exit(1);
    }
  }

  console.log(`✅ All migrations complete`);
}

module.exports = runMigrations;