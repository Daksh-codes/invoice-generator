const express = require("express");
const router = express.Router();
const db = require("../db");

// CREATE INVOICE
router.post("/new", (req, res) => {
  const {
    issuer_id,
    client_id,
    bill_date,
    payment_terms,
    due_date,
    items,        // [{ description, quantity, rate, amount }]
    subtotal,
    discount,
    total,
    total_in_words
  } = req.body;

  // Get and increment invoice counter
  const issuer = db.prepare(
    "SELECT invoice_prefix, invoice_counter FROM issuer WHERE id = ?"
  ).get(issuer_id);

  const bill_number = issuer.invoice_prefix + issuer.invoice_counter;

  db.prepare(
    "UPDATE issuer SET invoice_counter = invoice_counter + 1 WHERE id = ?"
  ).run(issuer_id);

  // Insert invoice
  const invoiceResult = db.prepare(`
    INSERT INTO invoice (
      issuer_id, client_id, bill_number, bill_date,
      payment_terms, due_date, subtotal, discount, total, total_in_words
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
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
  );

  const invoice_id = invoiceResult.lastInsertRowid;

  // Insert items
  const itemStmt = db.prepare(`
    INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      itemStmt.run(
        invoice_id,
        item.description,
        item.quantity,
        item.rate,
        item.amount
      );
    }
  });

  insertMany(items);

  res.json({
    success: true,
    invoice_id,
    bill_number
  });
});

// GET NEXT INVOICE NUMBER (for preview before saving)
router.get("/next-number/:issuer_id", (req, res) => {
  const { issuer_id } = req.params;

  const issuer = db.prepare(`
    SELECT invoice_prefix, invoice_counter
    FROM issuer
    WHERE id = ?
  `).get(issuer_id);

  if (!issuer) {
    return res.status(404).json({ message: "Issuer not found" });
  }

  const nextNumber = issuer.invoice_prefix + issuer.invoice_counter;

  res.json({ nextNumber });
});


// GET ALL INVOICES (list view)
router.get("/", (req, res) => {
  const invoices = db.prepare(`
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
  `).all();

  res.json(invoices);
});

// GET FULL INVOICE BY ID (for preview / print)
router.get("/:id", (req, res) => {
  const invoiceId = req.params.id;

  const invoice = db.prepare(`
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
  `).get(invoiceId);

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  const items = db.prepare(`
    SELECT description, quantity, rate, amount
    FROM invoice_items
    WHERE invoice_id = ?
  `).all(invoiceId);

  res.json({
    ...invoice,
    items
  });
});

// Mark invoice as Paid or Unpaid
router.put("/:id/status", (req, res) => {
  const { payment_status } = req.body; // 'paid' or 'unpaid'

  db.prepare(`
    UPDATE invoice
    SET payment_status = ?
    WHERE id = ?
  `).run(payment_status, req.params.id);

  res.json({ success: true });
});

// GET invoices by status (paid / unpaid)
router.get("/status/:status", (req, res) => {
  const { status } = req.params; // 'paid' or 'unpaid'

  const invoices = db.prepare(`
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
  `).all(status);

  res.json(invoices);
});







module.exports = router;
