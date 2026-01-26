const express = require("express");
const router = express.Router();
const db = require("../db");

// CREATE
router.post("/new", (req, res) => {
  const {
    issuer_id,
    account_holder_name,
    bank_name,
    account_number,
    account_type,
    ifsc_code,
    branch,
    upi_qr,
  } = req.body;

  const result = db
    .prepare(
      `
    INSERT INTO bank (
      issuer_id,
      account_holder_name,
      bank_name,
      account_number,
      account_type,
      ifsc_code,
      branch,
      upi_qr
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      issuer_id,
      account_holder_name,
      bank_name,
      account_number,
      account_type,
      ifsc_code,
      branch,
      upi_qr,
    );

  res.json({ id: result.lastInsertRowid });
});
// SPECIFIC FIRST
router.get("/issuer/:issuer_id", (req, res) => {
  const { issuer_id } = req.params;

  const bank = db
    .prepare("SELECT * FROM bank WHERE issuer_id = ?")
    .get(issuer_id);

  if (!bank) {
    return res.status(404).json({ message: "No bank found for this issuer" });
  }

  res.json(bank);
});

// THEN GENERIC
router.get("/:id", (req, res) => {
  const bank = db.prepare("SELECT * FROM bank WHERE id = ?").get(req.params.id);
  res.json(bank);
});

// UPDATE
router.put("/:id", (req, res) => {
  const {
    account_holder_name,
    bank_name,
    account_number,
    account_type,
    ifsc_code,
    branch,
    upi_qr,
  } = req.body;

  db.prepare(
    `
    UPDATE bank SET
      account_holder_name = ?,
      bank_name = ?,
      account_number = ?,
      account_type = ?,
      ifsc_code = ?,
      branch = ?,
      upi_qr = ?
    WHERE id = ?
  `,
  ).run(
    account_holder_name,
    bank_name,
    account_number,
    account_type,
    ifsc_code,
    branch,
    upi_qr,
    req.params.id,
  );

  res.json({ success: true });
});

// DELETE
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM bank WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
