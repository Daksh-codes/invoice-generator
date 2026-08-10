const db = require("../db");
const fs = require("fs");
const path = require("path");

const insertBankStmt = db.prepare(`
  INSERT INTO bank (
    issuer_id, account_holder_name, bank_name,
    account_number, account_type, ifsc_code, branch, upi_qr
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateBankStmt = db.prepare(`
  UPDATE bank SET
    account_holder_name = ?,
    bank_name = ?,
    account_number = ?,
    account_type = ?,
    ifsc_code = ?,
    branch = ?,
    upi_qr = ?
  WHERE id = ?
`);

const createBankTx = db.transaction((payload) => {
  const issuer = db.prepare("SELECT id FROM issuer WHERE id = ?").get(payload.issuer_id);
  if (!issuer) {
    const err = new Error("Issuer not found");
    err.statusCode = 404;
    throw err;
  }

  const existing = db.prepare("SELECT id FROM bank WHERE issuer_id = ?").get(payload.issuer_id);
  if (existing) {
    const err = new Error("Issuer already has a bank account — update it instead");
    err.statusCode = 409;
    throw err;
  }

  return insertBankStmt.run(
    payload.issuer_id,
    payload.account_holder_name?.trim() || null,
    payload.bank_name?.trim() || null,
    payload.account_number?.trim() || null,
    payload.account_type?.trim() || null,
    payload.ifsc_code?.trim()?.toUpperCase() || null,
    payload.branch?.trim() || null,
    payload.upi_qr?.trim() || null,
  ).lastInsertRowid;
});

const updateBankTx = db.transaction((id, payload) => {
  return updateBankStmt.run(
    payload.account_holder_name?.trim() || null,
    payload.bank_name?.trim() || null,
    payload.account_number?.trim() || null,
    payload.account_type?.trim() || null,
    payload.ifsc_code?.trim()?.toUpperCase() || null,
    payload.branch?.trim() || null,
    payload.upi_qr?.trim() || null,
    id,
  ).changes;
});

function createBank(req, res) {
  try {
    if (!req.body.issuer_id) {
      return res.status(400).json({ message: "issuer_id is required" });
    }
    // Attach QR path if file was uploaded
    if (req.file) {
      req.body.upi_qr = `/images/${req.file.filename}`;
    }
    const id = createBankTx(req.body);
    res.json({ id });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(err.statusCode || 500).json({ message: err.message || "Failed to create bank" });
  }
}

function getBankByIssuer(req, res) {
  const bank = db.prepare("SELECT * FROM bank WHERE issuer_id = ?").get(req.params.issuer_id);
  if (!bank) return res.status(404).json({ message: "No bank found for this issuer" });
  res.json(bank);
}

function getBankById(req, res) {
  const bank = db.prepare("SELECT * FROM bank WHERE id = ?").get(req.params.id);
  if (!bank) return res.status(404).json({ message: "Bank not found" });
  res.json(bank);
}

function getAllBankNames(req, res) {
  const rows = db.prepare(`
    SELECT DISTINCT bank_name FROM bank
    WHERE bank_name IS NOT NULL AND TRIM(bank_name) != ''
    ORDER BY bank_name ASC
  `).all();
  res.json(rows.map((r) => r.bank_name));
}

function updateBank(req, res) {
  try {
    const changes = updateBankTx(req.params.id, req.body);
    if (!changes) return res.status(404).json({ message: "Bank not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || "Failed to update bank" });
  }
}

function deleteBank(req, res) {
  try {
    const changes = db.prepare("DELETE FROM bank WHERE id = ?").run(req.params.id).changes;
    if (!changes) return res.status(404).json({ message: "Bank not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete bank" });
  }
}


function uploadQr(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const bank = db.prepare("SELECT id, upi_qr FROM bank WHERE id = ?").get(req.params.id);
    if (!bank) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Bank not found" });
    }

    // Delete old QR from disk
    if (bank.upi_qr) {
      const oldFile = path.join(__dirname, "..", bank.upi_qr);
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    const newPath = `/images/${req.file.filename}`;
    db.prepare("UPDATE bank SET upi_qr = ? WHERE id = ?").run(newPath, req.params.id);

    res.json({ success: true, upi_qr: newPath });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
}


module.exports = {
  createBank,
  getBankByIssuer,
  getBankById,
  getAllBankNames,
  updateBank,
  deleteBank,
  uploadQr
};