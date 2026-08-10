const db = require("../db");
const fs = require("fs");
const path = require("path");

const insertIssuerStmt = db.prepare(`
  INSERT INTO issuer (
    firm_name, sub_heading, logo, address, phone, email,
    pan, gstin, is_gst_enabled, signature_image,
    invoice_prefix, invoice_counter,
    quotation_prefix, quotation_counter
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)
`);

// Counters intentionally excluded — only billing tx ever touches them
// Prefixes excluded from update if bills already exist — see updateIssuerTx
const updateIssuerStmt = db.prepare(`
  UPDATE issuer SET
    firm_name = ?,
    sub_heading = ?,
    logo = ?,
    address = ?,
    phone = ?,
    email = ?,
    pan = ?,
    gstin = ?,
    is_gst_enabled = ?,
    signature_image = ?
  WHERE id = ?
`);

// Separate statement used only when prefix change is safe (no bills yet)
const updateIssuerWithPrefixStmt = db.prepare(`
  UPDATE issuer SET
    firm_name = ?,
    sub_heading = ?,
    logo = ?,
    address = ?,
    phone = ?,
    email = ?,
    pan = ?,
    gstin = ?,
    is_gst_enabled = ?,
    signature_image = ?,
    invoice_prefix = ?,
    quotation_prefix = ?
  WHERE id = ?
`);

const createIssuerTx = db.transaction((payload) => {
  if (!payload.firm_name?.trim())
    throw Object.assign(new Error("Firm name is required"), {
      statusCode: 400,
    });
  if (!payload.invoice_prefix?.trim())
    throw Object.assign(new Error("Invoice prefix is required"), {
      statusCode: 400,
    });
  if (!payload.quotation_prefix?.trim())
    throw Object.assign(new Error("Quotation prefix is required"), {
      statusCode: 400,
    });

  return insertIssuerStmt.run(
    payload.firm_name.trim(),
    payload.sub_heading?.trim() || null,
    payload.logo?.trim() || null,
    payload.address?.trim() || null,
    payload.phone?.trim() || null,
    payload.email?.trim() || null,
    payload.pan?.trim()?.toUpperCase() || null,
    payload.gstin?.trim()?.toUpperCase() || null,
    payload.is_gst_enabled ? 1 : 0,
    payload.signature_image?.trim() || null,
    payload.invoice_prefix.trim(),
    payload.quotation_prefix.trim(),
  ).lastInsertRowid;
});

const updateIssuerTx = db.transaction((id, payload) => {
  if (!payload.firm_name?.trim())
    throw Object.assign(new Error("Firm name is required"), {
      statusCode: 400,
    });

  // Fetch existing logo so we don't overwrite it when no new logo is provided
  const existing = db
    .prepare("SELECT logo, signature_image FROM issuer WHERE id = ?")
    .get(id);

  const commonArgs = [
    payload.firm_name.trim(),
    payload.sub_heading?.trim() || null,
    payload.logo?.trim() || existing?.logo || null, // ← keep existing if not provided
    payload.address?.trim() || null,
    payload.phone?.trim() || null,
    payload.email?.trim() || null,
    payload.pan?.trim()?.toUpperCase() || null,
    payload.gstin?.trim()?.toUpperCase() || null,
    payload.is_gst_enabled ? 1 : 0,
    payload.signature_image?.trim() || existing?.signature_image || null, // ← same for signature
  ];
  // EDGE CASE: if prefix is being changed, check if any bills already exist
  // Changing prefix after bills exist would make new numbers inconsistent with old ones
  const hasBills = db
    .prepare("SELECT 1 FROM invoice WHERE issuer_id = ? LIMIT 1")
    .get(id);

  if (hasBills) {
    // Silently ignore prefix changes — bills already exist, prefix is locked
    return updateIssuerStmt.run(...commonArgs, id).changes;
  }

  // No bills yet — safe to update prefixes too
  if (!payload.invoice_prefix?.trim())
    throw Object.assign(new Error("Invoice prefix is required"), {
      statusCode: 400,
    });
  if (!payload.quotation_prefix?.trim())
    throw Object.assign(new Error("Quotation prefix is required"), {
      statusCode: 400,
    });

  return updateIssuerWithPrefixStmt.run(
    ...commonArgs,
    payload.invoice_prefix.trim(),
    payload.quotation_prefix.trim(),
    id,
  ).changes;
});

const deleteIssuerTx = db.transaction((id) => {
  const hasInvoices = db
    .prepare("SELECT 1 FROM invoice WHERE issuer_id = ? LIMIT 1")
    .get(id);

  if (hasInvoices)
    throw Object.assign(
      new Error("Cannot delete issuer with existing invoices"),
      { statusCode: 409 },
    );

  db.prepare("DELETE FROM bank WHERE issuer_id = ?").run(id);
  return db.prepare("DELETE FROM issuer WHERE id = ?").run(id).changes;
});

function createIssuer(req, res) {
  try {
    // If multer processed a file, attach path to body before validation
    if (req.file) {
      req.body.logo = `/images/${req.file.filename}`;
    }
    const id = createIssuerTx(req.body);
    res.json({ id });
  } catch (err) {
    // Clean up uploaded file if DB write failed
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to create issuer" });
  }
}

function getIssuerById(req, res) {
  const issuer = db
    .prepare("SELECT * FROM issuer WHERE id = ?")
    .get(req.params.id);
  if (!issuer) return res.status(404).json({ message: "Issuer not found" });
  res.json(issuer);
}

function getAllIssuers(req, res) {
  const issuers = db
    .prepare("SELECT * FROM issuer ORDER BY firm_name ASC")
    .all();
  res.json(issuers);
}

function updateIssuer(req, res) {
  try {
    const changes = updateIssuerTx(req.params.id, req.body);
    if (!changes) return res.status(404).json({ message: "Issuer not found" });
    res.json({ success: true });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to update issuer" });
  }
}

function deleteIssuer(req, res) {
  try {
    const changes = deleteIssuerTx(req.params.id);
    if (!changes) return res.status(404).json({ message: "Issuer not found" });
    res.json({ success: true });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Failed to delete issuer" });
  }
}

const changePrefixTx = db.transaction((issuer_id, doc_type, new_prefix) => {
  if (!new_prefix?.trim())
    throw Object.assign(new Error("New prefix is required"), {
      statusCode: 400,
    });

  const col = doc_type === "INVOICE" ? "invoice" : "quotation";

  const issuer = db.prepare("SELECT * FROM issuer WHERE id = ?").get(issuer_id);
  if (!issuer)
    throw Object.assign(new Error("Issuer not found"), { statusCode: 404 });

  const currentPrefix = issuer[`${col}_prefix`];
  const currentCounter = issuer[`${col}_counter`];

  // No-op if same prefix
  if (currentPrefix === new_prefix.trim())
    throw Object.assign(new Error("New prefix is the same as current prefix"), {
      statusCode: 400,
    });

  // Close out the current prefix history entry
  db.prepare(
    `
    UPDATE prefix_history
    SET counter_end = ?
    WHERE issuer_id = ? AND doc_type = ? AND counter_end IS NULL
  `,
  ).run(currentCounter, issuer_id, doc_type);

  // CORRECT — omit counter_end, it defaults to NULL automatically
  db.prepare(
    `
  INSERT INTO prefix_history (issuer_id, doc_type, prefix, counter_start)
  VALUES (?, ?, ?, 1)
`,
  ).run(issuer_id, doc_type, new_prefix.trim());

  // Reset counter to 1 and update prefix
  db.prepare(
    `
    UPDATE issuer SET ${col}_prefix = ?, ${col}_counter = 1 WHERE id = ?
  `,
  ).run(new_prefix.trim(), issuer_id);

  return {
    previous_prefix: currentPrefix,
    new_prefix: new_prefix.trim(),
    counter_reset_to: 1,
  };
});

function changePrefix(req, res) {
  try {
    const { doc_type, new_prefix } = req.body;
    if (!["INVOICE", "QUOTATION"].includes(doc_type))
      return res
        .status(400)
        .json({ message: "doc_type must be INVOICE or QUOTATION" });

    const result = changePrefixTx(req.params.id, doc_type, new_prefix);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

function getPrefixHistory(req, res) {
  const rows = db
    .prepare(
      `
    SELECT doc_type, prefix, counter_start, counter_end, changed_at
    FROM prefix_history
    WHERE issuer_id = ?
    ORDER BY doc_type, changed_at ASC
  `,
    )
    .all(req.params.id);
  res.json(rows);
}

function uploadLogo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const issuer = db
      .prepare("SELECT id, logo FROM issuer WHERE id = ?")
      .get(req.params.id);
    if (!issuer) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Issuer not found" });
    }

    // Delete old logo from disk
    if (issuer.logo) {
      const oldFile = path.join(__dirname, "..", issuer.logo);
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    const newPath = `/images/${req.file.filename}`;
    db.prepare("UPDATE issuer SET logo = ? WHERE id = ?").run(
      newPath,
      req.params.id,
    );

    res.json({ success: true, logo: newPath });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createIssuer,
  getIssuerById,
  getAllIssuers,
  updateIssuer,
  deleteIssuer,
  changePrefix,
  getPrefixHistory,
  uploadLogo,
};
