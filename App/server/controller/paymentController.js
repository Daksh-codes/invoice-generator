const db = require("../db");

function getInvoice(id) {
  return db.prepare("SELECT id, total, status FROM invoice WHERE id = ?").get(id);
}

function ensurePaymentColumns() {
  const paymentColumns = db.prepare("PRAGMA table_info(payments)").all();
  if (!paymentColumns.some((column) => column.name === "transaction_id")) {
    db.exec("ALTER TABLE payments ADD COLUMN transaction_id TEXT");
  }
  if (paymentColumns.some((column) => column.name === "transaction_number")) {
    db.prepare(`
      UPDATE payments
      SET transaction_id = transaction_number
      WHERE (transaction_id IS NULL OR TRIM(transaction_id) = '')
        AND transaction_number IS NOT NULL
        AND TRIM(transaction_number) != ''
    `).run();
  }

  const modeColumns = db.prepare("PRAGMA table_info(payment_modes)").all();
  if (!modeColumns.some((column) => column.name === "requires_transaction_id")) {
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

function modeRequiresTransactionId(mode) {
  ensurePaymentColumns();
  if (!mode) return false;
  const row = db
    .prepare("SELECT requires_transaction_id FROM payment_modes WHERE label = ?")
    .get(mode);
  if (row) return !!row.requires_transaction_id;
  return mode.trim().toLowerCase() !== "cash";
}

function recalculateInvoicePayment(invoiceId) {
  const invoice = getInvoice(invoiceId);
  if (!invoice) {
    throw Object.assign(new Error("Invoice not found"), { statusCode: 404 });
  }

  const total = Number(invoice.total ?? 0);
  const paid = Number(
    db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = ?")
      .get(invoiceId).total ?? 0,
  );
  const latest = db
    .prepare(
      `
      SELECT mode, transaction_id, payment_date
      FROM payments
      WHERE invoice_id = ?
      ORDER BY payment_date DESC, id DESC
      LIMIT 1
    `,
    )
    .get(invoiceId);

  const paymentStatus = paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";

  db.prepare(
    `
      UPDATE invoice
      SET paid_amount = ?,
          payment_status = ?,
          payment_mode = ?,
          paid_date = ?
      WHERE id = ?
    `,
  ).run(
    paid,
    paymentStatus,
    latest?.mode ?? null,
    latest?.payment_date ?? null,
    invoiceId,
  );

  return db
    .prepare(
      `
      SELECT id, paid_amount, payment_status, payment_mode, paid_date, total
      FROM invoice
      WHERE id = ?
    `,
    )
    .get(invoiceId);
}

function listPayments(invoiceId) {
  ensurePaymentColumns();
  return db
    .prepare(
      `
      SELECT id, invoice_id, amount, mode, transaction_id, payment_date, created_at
      FROM payments
      WHERE invoice_id = ?
      ORDER BY payment_date ASC, id ASC
    `,
    )
    .all(invoiceId);
}

function getPayments(req, res) {
  try {
    ensurePaymentColumns();
    const invoiceId = Number(req.params.invoiceId);
    if (!invoiceId) return res.status(400).json({ message: "invoiceId is required" });
    getInvoice(invoiceId);
    const invoice = recalculateInvoicePayment(invoiceId);
    res.json({ payments: listPayments(invoiceId), invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

function addPayment(req, res) {
  try {
    ensurePaymentColumns();
    const invoiceId = Number(req.body.invoice_id);
    const amount = Number(req.body.amount);
    const mode = req.body.mode?.trim() || null;
    const transactionId = req.body.transaction_id?.trim() || null;
    const paymentDate = req.body.payment_date?.trim();

    if (!invoiceId) return res.status(400).json({ message: "invoice_id is required" });
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "amount must be greater than 0" });
    }
    if (!paymentDate) return res.status(400).json({ message: "payment_date is required" });
    if (modeRequiresTransactionId(mode) && !transactionId) {
      return res.status(400).json({ message: "transaction_id is required for this payment mode" });
    }

    const invoice = getInvoice(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.status !== "active") {
      return res.status(400).json({ message: "Payments can only be added to active invoices" });
    }

    const paid = Number(
      db
        .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = ?")
        .get(invoiceId).total ?? 0,
    );
    const balance = Number(invoice.total ?? 0) - paid;
    if (amount > balance + 0.0001) {
      return res.status(400).json({ message: "Payment exceeds remaining balance" });
    }

    const result = db
      .prepare(
        `
        INSERT INTO payments (invoice_id, amount, mode, transaction_id, payment_date)
        VALUES (?, ?, ?, ?, ?)
      `,
      )
      .run(invoiceId, amount, mode, transactionId, paymentDate);

    const updatedInvoice = recalculateInvoicePayment(invoiceId);
    res.json({
      payment: {
        id: result.lastInsertRowid,
        invoice_id: invoiceId,
        amount,
        mode,
        transaction_id: transactionId,
        payment_date: paymentDate,
      },
      payments: listPayments(invoiceId),
      invoice: updatedInvoice,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

function deletePayment(req, res) {
  try {
    const payment = db
      .prepare("SELECT id, invoice_id FROM payments WHERE id = ?")
      .get(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    db.prepare("DELETE FROM payments WHERE id = ?").run(req.params.id);
    const invoice = recalculateInvoicePayment(payment.invoice_id);
    res.json({ ok: true, payments: listPayments(payment.invoice_id), invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

module.exports = {
  addPayment,
  deletePayment,
  getPayments,
  recalculateInvoicePayment,
};
