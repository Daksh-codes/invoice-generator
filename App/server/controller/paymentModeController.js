const db = require("../db");

function ensurePaymentModeColumns() {
  const columns = db.prepare("PRAGMA table_info(payment_modes)").all();
  const hasRequiresTransactionId = columns.some(
    (column) => column.name === "requires_transaction_id",
  );

  if (!hasRequiresTransactionId) {
    db.exec(
      "ALTER TABLE payment_modes ADD COLUMN requires_transaction_id INTEGER DEFAULT 0",
    );
    db.prepare(`
      UPDATE payment_modes
      SET requires_transaction_id = CASE
        WHEN LOWER(TRIM(label)) = 'cash' THEN 0
        ELSE 1
      END
    `).run();
  }
}

function getAll(req, res) {
  ensurePaymentModeColumns();
  const rows = db
    .prepare("SELECT label, requires_transaction_id FROM payment_modes ORDER BY id ASC")
    .all();
  res.json(
    rows.map((r) => ({
      label: r.label,
      requires_transaction_id: r.requires_transaction_id ? 1 : 0,
    })),
  );
}

function create(req, res) {
  ensurePaymentModeColumns();
  const { label, requires_transaction_id } = req.body;
  if (!label?.trim()) return res.status(400).json({ message: "Label required" });
  const requiresTransactionId = requires_transaction_id ? 1 : 0;
  try {
    const id = db
      .prepare("INSERT INTO payment_modes (label, requires_transaction_id) VALUES (?, ?)")
      .run(label.trim(), requiresTransactionId).lastInsertRowid;
    res.json({
      id,
      label: label.trim(),
      requires_transaction_id: requiresTransactionId,
    });
  } catch (err) {
    res.status(409).json({ message: "Mode already exists" });
  }
}

module.exports = { getAll, create };
