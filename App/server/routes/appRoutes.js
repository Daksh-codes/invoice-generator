const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/bootstrap", (req, res) => {
  try {
    const issuers = db.prepare(`
      SELECT
        i.*,
        b.id AS bank_id,
        b.account_holder_name, b.bank_name, b.account_number,
        b.account_type, b.ifsc_code, b.branch, b.upi_qr
      FROM issuer i
      LEFT JOIN bank b ON b.issuer_id = i.id
    `).all();

    const clients = db.prepare(
      "SELECT * FROM client ORDER BY name ASC"
    ).all();

    const bankNames = db.prepare(`
      SELECT DISTINCT bank_name FROM bank
      WHERE bank_name IS NOT NULL AND TRIM(bank_name) != ''
      ORDER BY bank_name ASC
    `).all().map(r => r.bank_name);

    const prefixPreviews = db.prepare(`
      SELECT
        id,
        invoice_prefix || (invoice_counter + 1) AS next_invoice_number,
        quotation_prefix || (quotation_counter + 1) AS next_quotation_number
      FROM issuer
    `).all();

    res.json({
      issuers,
      clients,
      bankNames,
      prefixPreviews,  // keyed by issuer id on frontend
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;