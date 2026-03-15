const db = require("../db");

const getQuotationCounterStmt = db.prepare(
  "SELECT quotation_prefix, quotation_counter FROM issuer WHERE id = ?",
);
const incrementQuotationCounterStmt = db.prepare(
  "UPDATE issuer SET quotation_counter = quotation_counter + 1 WHERE id = ?",
);
const getInvoiceCounterStmt = db.prepare(
  "SELECT invoice_prefix, invoice_counter FROM issuer WHERE id = ?",
);
const incrementInvoiceCounterStmt = db.prepare(
  "UPDATE issuer SET invoice_counter = invoice_counter + 1 WHERE id = ?",
);
const insertQuotationStmt = db.prepare(`
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
    total_in_words,
    payment_status,
    doc_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'QUOTATION')
`);
const insertInvoiceFromQuotationStmt = db.prepare(`
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
    total_in_words,
    payment_status,
    doc_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'INVOICE')
`);
const insertInvoiceItemStmt = db.prepare(`
  INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
  VALUES (?, ?, ?, ?, ?)
`);

const createQuotationTx = db.transaction((payload) => {
  const issuer = getQuotationCounterStmt.get(payload.issuer_id);

  if (!issuer) {
    const error = new Error("Issuer not found");
    error.statusCode = 404;
    throw error;
  }

  const quotation_number = issuer.quotation_prefix + issuer.quotation_counter;

  incrementQuotationCounterStmt.run(payload.issuer_id);

  const result = insertQuotationStmt.run(
    payload.issuer_id,
    payload.client_id,
    quotation_number,
    payload.bill_date,
    payload.payment_terms,
    payload.due_date,
    payload.subtotal,
    payload.discount,
    payload.total,
    payload.total_in_words,
  );

  const quotation_id = result.lastInsertRowid;

  for (const item of payload.items || []) {
    insertInvoiceItemStmt.run(
      quotation_id,
      item.description,
      item.quantity,
      item.rate,
      item.amount,
    );
  }

  return { quotation_id, quotation_number };
});

const convertQuotationTx = db.transaction((quotationId) => {
  const quotation = db
    .prepare(
      "SELECT * FROM invoice WHERE id = ? AND doc_type = 'QUOTATION'",
    )
    .get(quotationId);

  if (!quotation) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }

  const issuer = getInvoiceCounterStmt.get(quotation.issuer_id);

  if (!issuer) {
    const error = new Error("Issuer not found");
    error.statusCode = 404;
    throw error;
  }

  const newInvoiceNumber = issuer.invoice_prefix + issuer.invoice_counter;

  incrementInvoiceCounterStmt.run(quotation.issuer_id);

  const result = insertInvoiceFromQuotationStmt.run(
    quotation.issuer_id,
    quotation.client_id,
    newInvoiceNumber,
    quotation.bill_date,
    quotation.payment_terms,
    quotation.due_date,
    quotation.subtotal,
    quotation.discount,
    quotation.total,
    quotation.total_in_words,
  );

  const newInvoiceId = result.lastInsertRowid;

  const items = db
    .prepare(
      "SELECT description, quantity, rate, amount FROM invoice_items WHERE invoice_id = ?",
    )
    .all(quotationId);

  for (const item of items) {
    insertInvoiceItemStmt.run(
      newInvoiceId,
      item.description,
      item.quantity,
      item.rate,
      item.amount,
    );
  }

  return { new_invoice_id: newInvoiceId, invoice_number: newInvoiceNumber };
});

function createQuotation(req, res) {
  try {
    const result = createQuotationTx(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || "Failed to create quotation" });
  }
}

function getAllQuotations(req, res) {
  const quotations = db
    .prepare(`
      SELECT
        invoice.id,
        invoice.bill_number,
        invoice.bill_date,
        client.name AS client_name,
        invoice.total
      FROM invoice
      JOIN client ON invoice.client_id = client.id
      WHERE invoice.doc_type = 'QUOTATION'
      ORDER BY invoice.created_at DESC
    `)
    .all();

  res.json(quotations);
}

function getQuotationById(req, res) {
  const quotationId = req.params.id;

  const quotation = db
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
      AND invoice.doc_type = 'QUOTATION'
    `)
    .get(quotationId);

  if (!quotation) {
    return res.status(404).json({ message: "Quotation not found" });
  }

  const items = db
    .prepare(`
      SELECT description, quantity, rate, amount
      FROM invoice_items
      WHERE invoice_id = ?
    `)
    .all(quotationId);

  res.json({
    ...quotation,
    items,
  });
}

function getNextQuotationNumber(req, res) {
  const { issuer_id } = req.params;

  const issuer = db
    .prepare("SELECT quotation_prefix, quotation_counter FROM issuer WHERE id = ?")
    .get(issuer_id);

  if (!issuer) {
    return res.status(404).json({ message: "Issuer not found" });
  }

  const nextNumber = issuer.quotation_prefix + issuer.quotation_counter;

  res.json({ nextNumber });
}

function convertQuotationToInvoice(req, res) {
  try {
    const result = convertQuotationTx(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || "Failed to convert quotation" });
  }
}

module.exports = {
  createQuotation,
  getAllQuotations,
  getQuotationById,
  getNextQuotationNumber,
  convertQuotationToInvoice,
};
