const express = require("express");
const router = express.Router();
const db = require("../db");

// CREATE
router.post("/new", (req, res) => {
  const {
    firm_name,
    sub_heading,
    logo,
    address,
    phone,
    email,
    pan,
    signature_image,
    invoice_prefix,
    invoice_counter,
    quotation_prefix,
    quotation_counter,
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO issuer (
      firm_name, sub_heading, logo, address, phone, email, pan,
      signature_image, invoice_prefix, invoice_counter,
      quotation_prefix, quotation_counter
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    firm_name,
    sub_heading,
    logo,
    address,
    phone,
    email,
    pan,
    signature_image,
    invoice_prefix,
    invoice_counter || 1,
    quotation_prefix,
    quotation_counter || 1
  );

  res.json({ id: result.lastInsertRowid });
});

// READ (get issuer)
router.get("/:id", (req, res) => {
  const issuer = db
    .prepare("SELECT * FROM issuer WHERE id = ?")
    .get(req.params.id);

  res.json(issuer);
});

// GET ALL ISSUERS (for dropdown)
router.get("/", (req, res) => {
  const issuers = db.prepare("SELECT * FROM issuer").all();
  res.json(issuers);
});


// UPDATE
router.put("/:id", (req, res) => {
  const {
    firm_name,
    sub_heading,
    logo,
    address,
    phone,
    email,
    pan,
    signature_image,
    invoice_prefix,
    invoice_counter,
    quotation_prefix,
    quotation_counter,
  } = req.body;

  db.prepare(`
    UPDATE issuer SET
      firm_name = ?, sub_heading = ?, logo = ?, address = ?, phone = ?,
      email = ?, pan = ?, signature_image = ?, invoice_prefix = ?,
      invoice_counter = ?, quotation_prefix = ?, quotation_counter = ?
    WHERE id = ?
  `).run(
    firm_name,
    sub_heading,
    logo,
    address,
    phone,
    email,
    pan,
    signature_image,
    invoice_prefix,
    invoice_counter,
    quotation_prefix,
    quotation_counter,
    req.params.id
  );

  res.json({ success: true });
});

// DELETE
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM issuer WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
