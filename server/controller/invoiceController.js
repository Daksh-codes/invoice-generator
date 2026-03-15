const db = require("../db");

const getIssuerCounterStmt = db.prepare(
  "SELECT invoice_prefix, invoice_counter FROM issuer WHERE id = ?",
);
const incrementIssuerCounterStmt = db.prepare(
  "UPDATE issuer SET invoice_counter = invoice_counter + 1 WHERE id = ?",
);
const insertInvoiceStmt = db.prepare(`
  INSERT INTO invoice (
    issuer_id,
    client_id,
    bill_number,
    bill_date,
    payment_terms,
    due_date,
    subtotal,
    discount,
    total,
    total_in_words
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertInvoiceItemStmt = db.prepare(`
  INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
  VALUES (?, ?, ?, ?, ?)
`);
const updateInvoiceStatusStmt = db.prepare(
  "UPDATE invoice SET payment_status = ? WHERE id = ?",
);

const createInvoiceTx = db.transaction((payload) => {
  const issuer = getIssuerCounterStmt.get(payload.issuer_id);

  if (!issuer) {
    const error = new Error("Issuer not found");
    error.statusCode = 404;
    throw error;
  }

  const bill_number = issuer.invoice_prefix + issuer.invoice_counter;

  incrementIssuerCounterStmt.run(payload.issuer_id);

  const invoiceResult = insertInvoiceStmt.run(
    payload.issuer_id,
    payload.client_id,
    bill_number,
    payload.bill_date,
    payload.payment_terms,
    payload.due_date,
    payload.subtotal,
    payload.discount,
    payload.total,
    payload.total_in_words,
  );

  const invoice_id = invoiceResult.lastInsertRowid;

  for (const item of payload.items || []) {
    insertInvoiceItemStmt.run(
      invoice_id,
      item.description,
      item.quantity,
      item.rate,
      item.amount,
    );
  }

  return { invoice_id, bill_number };
});

const updateInvoiceStatusTx = db.transaction((id, payment_status) => {
  const result = updateInvoiceStatusStmt.run(payment_status, id);
  return result.changes;
});

function createInvoice(req, res) {
  try {
    const result = createInvoiceTx(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || "Failed to create invoice" });
  }
}

function getNextInvoiceNumber(req, res) {
  const { issuer_id } = req.params;

  const issuer = db
    .prepare("SELECT invoice_prefix, invoice_counter FROM issuer WHERE id = ?")
    .get(issuer_id);

  if (!issuer) {
    return res.status(404).json({ message: "Issuer not found" });
  }

  const nextNumber = issuer.invoice_prefix + issuer.invoice_counter;
  res.json({ nextNumber });
}

function getAllInvoices(req, res) {
  const invoices = db
    .prepare(`
      SELECT
        invoice.id,
        invoice.bill_number,
        invoice.bill_date,
        client.name AS client_name,
        invoice.total,
        invoice.payment_status
      FROM invoice
      JOIN client ON invoice.client_id = client.id
      ORDER BY invoice.created_at DESC
    `)
    .all();

  res.json(invoices);
}

function getInvoiceById(req, res) {
  const invoiceId = req.params.id;

  const invoice = db
    .prepare(`
      SELECT
        invoice.*,
        issuer.firm_name,
        issuer.sub_heading,
        issuer.logo,
        issuer.address AS firm_address,
        issuer.phone,
        issuer.email,
        issuer.pan,
        issuer.signature_image,
        client.name AS client_name,
        bank.account_holder_name,
        bank.bank_name,
        bank.account_number,
        bank.account_type,
        bank.ifsc_code,
        bank.branch,
        bank.upi_qr
      FROM invoice
      JOIN issuer ON invoice.issuer_id = issuer.id
      JOIN client ON invoice.client_id = client.id
      LEFT JOIN bank ON bank.issuer_id = issuer.id
      WHERE invoice.id = ?
    `)
    .get(invoiceId);

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  const items = db
    .prepare(`
      SELECT description, quantity, rate, amount
      FROM invoice_items
      WHERE invoice_id = ?
    `)
    .all(invoiceId);

  res.json({
    ...invoice,
    items,
  });
}

function updateInvoiceStatus(req, res) {
  try {
    const { payment_status } = req.body;
    const changes = updateInvoiceStatusTx(req.params.id, payment_status);

    if (!changes) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to update invoice status", error: error.message });
  }
}

function getInvoicesByStatus(req, res) {
  const { status } = req.params;

  const invoices = db
    .prepare(`
      SELECT
        invoice.id,
        invoice.bill_number,
        invoice.bill_date,
        client.name AS client_name,
        invoice.total,
        invoice.payment_status
      FROM invoice
      JOIN client ON invoice.client_id = client.id
      WHERE invoice.payment_status = ?
      ORDER BY invoice.created_at DESC
    `)
    .all(status);

  res.json(invoices);
}

module.exports = {
  createInvoice,
  getNextInvoiceNumber,
  getAllInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  getInvoicesByStatus,
};
