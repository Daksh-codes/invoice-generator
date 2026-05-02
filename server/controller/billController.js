const db = require("../db");
const { recalculateInvoicePayment } = require("./paymentController");

// ── Prepared statements ────────────────────────────────────────────────────

const insertBillStmt = db.prepare(`
  INSERT INTO invoice (
    issuer_id, client_id, template, bill_number, bill_date,
    payment_terms, due_date, subtotal, discount,
    tax_total, cgst, sgst, igst, is_igst,
    total, total_in_words, notes, spacer_rows,
    doc_type, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertItemStmt = db.prepare(`
  INSERT INTO invoice_items (
    invoice_id, description, quantity, rate, amount,
    hsn_code, tax_rate, tax_amount
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// ── Helpers ────────────────────────────────────────────────────────────────

function insertItems(invoice_id, items = []) {
  for (const item of items) {
    insertItemStmt.run(
      invoice_id,
      item.description,
      item.quantity,
      item.rate,
      item.amount,
      item.hsn_code || null,
      item.tax_rate || 0,
      item.tax_amount || 0,
    );
  }
}

// Validates all required fields before any DB write happens
function validateBillPayload(payload, status) {
  if (!payload.issuer_id)
    throw Object.assign(new Error("issuer_id is required"), {
      statusCode: 400,
    });
  if (!payload.client_id)
    throw Object.assign(new Error("client_id is required"), {
      statusCode: 400,
    });
  if (!payload.bill_date?.trim())
    throw Object.assign(new Error("bill_date is required"), {
      statusCode: 400,
    });
  if (!payload.total_in_words?.trim())
    throw Object.assign(new Error("total_in_words is required"), {
      statusCode: 400,
    });

  if (
    payload.subtotal == null ||
    isNaN(payload.subtotal) ||
    payload.subtotal < 0
  )
    throw Object.assign(new Error("subtotal must be a non-negative number"), {
      statusCode: 400,
    });

  if (payload.total == null || isNaN(payload.total) || payload.total < 0)
    throw Object.assign(new Error("total must be a non-negative number"), {
      statusCode: 400,
    });

  if (
    payload.discount != null &&
    (isNaN(payload.discount) || payload.discount < 0)
  )
    throw Object.assign(new Error("discount must be a non-negative number"), {
      statusCode: 400,
    });

  // Active bills must have at least one valid item
  if (status === "active") {
    if (!Array.isArray(payload.items) || payload.items.length === 0)
      throw Object.assign(new Error("At least one item is required"), {
        statusCode: 400,
      });

    for (const [i, item] of payload.items.entries()) {
      if (!item.description?.trim())
        throw Object.assign(
          new Error(`Item ${i + 1}: description is required`),
          { statusCode: 400 },
        );
      if (item.quantity == null || isNaN(item.quantity) || item.quantity <= 0)
        throw Object.assign(
          new Error(`Item ${i + 1}: quantity must be greater than 0`),
          { statusCode: 400 },
        );
      if (item.rate == null || isNaN(item.rate) || item.rate < 0)
        throw Object.assign(
          new Error(`Item ${i + 1}: rate must be a non-negative number`),
          { statusCode: 400 },
        );
      if (item.amount == null || isNaN(item.amount) || item.amount < 0)
        throw Object.assign(
          new Error(`Item ${i + 1}: amount must be a non-negative number`),
          { statusCode: 400 },
        );
    }
  }
}

// ── Transactions ───────────────────────────────────────────────────────────

const createBillTx = db.transaction((payload, doc_type) => {
  // EDGE CASE: only allow draft or active on create — never allow creating a pre-voided bill
  const status = payload.status === "draft" ? "draft" : "active";

  validateBillPayload(payload, status);

  const col = doc_type === "INVOICE" ? "invoice" : "quotation";

  // Increment FIRST then read — guarantees unique number even with concurrent users
  const updated = db
    .prepare(
      `UPDATE issuer SET ${col}_counter = ${col}_counter + 1 WHERE id = ?`,
    )
    .run(payload.issuer_id);

  if (updated.changes === 0) {
    throw Object.assign(new Error("Issuer not found"), { statusCode: 404 });
  }

  // EDGE CASE: verify client actually exists before writing the bill
  const client = db
    .prepare("SELECT id FROM client WHERE id = ?")
    .get(payload.client_id);
  if (!client) {
    throw Object.assign(new Error("Client not found"), { statusCode: 404 });
  }

  const issuer = db
    .prepare(`SELECT ${col}_prefix, ${col}_counter FROM issuer WHERE id = ?`)
    .get(payload.issuer_id);

  const bill_number = issuer[`${col}_prefix`] + issuer[`${col}_counter`];

  const result = insertBillStmt.run(
    payload.issuer_id,
    payload.client_id,
    payload.template || "with_logo",
    bill_number,
    payload.bill_date.trim(),
    payload.payment_terms?.trim() || null,
    payload.due_date?.trim() || null,
    payload.subtotal,
    payload.discount || 0,
    payload.tax_total || 0,
    payload.cgst || 0,
    payload.sgst || 0,
    payload.igst || 0,
    payload.is_igst ? 1 : 0,
    payload.total,
    payload.total_in_words.trim(),
    payload.notes?.trim() || null,
    payload.spacer_rows ?? 3,
    doc_type,
    status,
  );

  const bill_id = result.lastInsertRowid;

  // Only insert items for active bills — drafts get items on finalize
  if (status === "active") {
    insertItems(bill_id, payload.items);
  }

  return { bill_id, bill_number };
});

const finalizeDraftTx = db.transaction((id, items) => {
  const bill = db
    .prepare("SELECT id, status FROM invoice WHERE id = ?")
    .get(id);

  if (!bill)
    throw Object.assign(new Error("Bill not found"), { statusCode: 404 });
  if (bill.status !== "draft")
    throw Object.assign(new Error("Bill is not a draft"), { statusCode: 400 });
  if (!Array.isArray(items) || items.length === 0)
    throw Object.assign(
      new Error("At least one item is required to finalize"),
      { statusCode: 400 },
    );

  // Validate items before touching DB
  for (const [i, item] of items.entries()) {
    if (!item.description?.trim())
      throw Object.assign(new Error(`Item ${i + 1}: description is required`), {
        statusCode: 400,
      });
    if (item.quantity == null || isNaN(item.quantity) || item.quantity <= 0)
      throw Object.assign(
        new Error(`Item ${i + 1}: quantity must be greater than 0`),
        { statusCode: 400 },
      );
    if (item.rate == null || isNaN(item.rate) || item.rate < 0)
      throw Object.assign(
        new Error(`Item ${i + 1}: rate must be a non-negative number`),
        { statusCode: 400 },
      );
    if (item.amount == null || isNaN(item.amount) || item.amount < 0)
      throw Object.assign(
        new Error(`Item ${i + 1}: amount must be a non-negative number`),
        { statusCode: 400 },
      );
  }

  // Clear any partial items then insert fresh
  db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(id);
  insertItems(id, items);
  db.prepare("UPDATE invoice SET status = 'active' WHERE id = ?").run(id);
});

const convertTx = db.transaction((quotationId) => {
  const quotation = db
    .prepare(
      "SELECT * FROM invoice WHERE id = ? AND doc_type = 'QUOTATION' AND status = 'active'",
    )
    .get(quotationId);

  if (!quotation) {
    throw Object.assign(new Error("Active quotation not found"), {
      statusCode: 404,
    });
  }

  // EDGE CASE: prevent converting the same quotation twice
  const alreadyConverted = db
    .prepare(
      "SELECT id FROM invoice WHERE doc_type = 'INVOICE' AND converted_from_id = ?",
    )
    .get(quotationId);

  if (alreadyConverted) {
    throw Object.assign(
      new Error(
        `Quotation already converted — invoice id: ${alreadyConverted.id}`,
      ),
      { statusCode: 409 },
    );
  }

  // Increment invoice counter first
  db.prepare(
    "UPDATE issuer SET invoice_counter = invoice_counter + 1 WHERE id = ?",
  ).run(quotation.issuer_id);

  const issuer = db
    .prepare("SELECT invoice_prefix, invoice_counter FROM issuer WHERE id = ?")
    .get(quotation.issuer_id);

  const bill_number = issuer.invoice_prefix + issuer.invoice_counter;

  const result = insertBillStmt.run(
    quotation.issuer_id,
    quotation.client_id,
    bill_number,
    quotation.bill_date,
    quotation.payment_terms,
    quotation.due_date,
    quotation.subtotal,
    quotation.discount,
    quotation.tax_total,
    quotation.cgst,
    quotation.sgst,
    quotation.igst,
    quotation.is_igst,
    quotation.total,
    quotation.total_in_words,
    quotation.notes,
    "INVOICE",
    "active",
  );

  const newId = result.lastInsertRowid;

  const items = db
    .prepare("SELECT * FROM invoice_items WHERE invoice_id = ?")
    .all(quotationId);

  insertItems(newId, items);

  // Mark quotation as converted so it cannot be converted again
  db.prepare("UPDATE invoice SET status = 'converted' WHERE id = ?").run(
    quotationId,
  );

  return { new_invoice_id: newId, invoice_number: bill_number };
});

// ── Controllers ────────────────────────────────────────────────────────────

function createBill(doc_type) {
  return (req, res) => {
    try {
      const result = createBillTx(req.body, doc_type);
      res.json({ success: true, ...result });
    } catch (err) {
      res
        .status(err.statusCode || 500)
        .json({ message: err.message || "Failed to create" });
    }
  };
}

function finalizeDraft(req, res) {
  try {
    finalizeDraftTx(req.params.id, req.body.items);
    res.json({ success: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

function voidBill(req, res) {
  try {
    const bill = db
      .prepare("SELECT status FROM invoice WHERE id = ?")
      .get(req.params.id);

    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (bill.status === "void")
      return res.status(400).json({ message: "Already voided" });
    if (bill.status === "draft")
      return res
        .status(400)
        .json({ message: "Cannot void a draft — just abandon it" });
    if (bill.status === "converted")
      return res
        .status(400)
        .json({ message: "Cannot void a converted quotation" });

    db.prepare(
      "UPDATE invoice SET status = 'void', payment_status = 'unpaid' WHERE id = ?",
    ).run(req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

function getNextNumber(req, res) {
  const { issuer_id } = req.params;
  const doc_type = req.query.doc_type || "INVOICE";
  const col = doc_type === "INVOICE" ? "invoice" : "quotation";

  const issuer = db
    .prepare(`SELECT ${col}_prefix, ${col}_counter FROM issuer WHERE id = ?`)
    .get(issuer_id);

  if (!issuer) return res.status(404).json({ message: "Issuer not found" });

  // Preview only — counter increments on actual create, not here
  const nextNum = issuer[`${col}_counter`] + 1;
  res.json({ nextNumber: issuer[`${col}_prefix`] + nextNum });
}

function getAll(req, res) {
  const doc_type = req.query.doc_type || "INVOICE";
  const include_drafts = req.query.include_drafts === "true";
  const include_void = req.query.include_void === "true";

  // EDGE CASE: use parameterized IN clause — no string interpolation of user input
  const excluded = ["converted"]; // converted quotations never shown in list
  // if (!include_void) excluded.push("void");
  // if (!include_drafts) excluded.push("draft");

  const placeholders = excluded.map(() => "?").join(", ");
  const params = [doc_type, ...excluded];

  const rows = db
    .prepare(
      `
    SELECT
      invoice.id,
      invoice.issuer_id,
      invoice.bill_number,
      invoice.bill_date,
      invoice.doc_type,
      invoice.status,
      invoice.payment_terms,
      invoice.template,
      client.name AS client_name,
      invoice.total,
      invoice.payment_status,
      invoice.paid_date, 
      invoice.payment_mode, 
      invoice.paid_amount,
      spacer_rows
    FROM invoice
    JOIN client ON invoice.client_id = client.id
    WHERE invoice.doc_type = ?
      AND invoice.status NOT IN (${placeholders})
    ORDER BY invoice.created_at DESC
  `,
    )
    .all(...params);

  res.json(rows);
}

function getById(req, res) {
  const bill = db
    .prepare(
      `
    SELECT
      invoice.*,
      issuer.firm_name, issuer.sub_heading, issuer.logo,
      issuer.address AS firm_address, issuer.phone, issuer.email,
      issuer.pan, issuer.signature_image, issuer.gstin, issuer.is_gst_enabled,
      client.name AS client_name, client.address AS client_address,
      bank.account_holder_name, bank.bank_name, bank.account_number,
      bank.account_type, bank.ifsc_code, bank.branch, bank.upi_qr
    FROM invoice
    JOIN issuer ON invoice.issuer_id = issuer.id
    JOIN client ON invoice.client_id = client.id
    LEFT JOIN bank ON bank.issuer_id = issuer.id
    WHERE invoice.id = ?
  `,
    )
    .get(req.params.id);

  if (!bill) return res.status(404).json({ message: "Not found" });

  const items = db
    .prepare(
      `
    SELECT description, quantity, rate, amount, hsn_code, tax_rate, tax_amount
    FROM invoice_items WHERE invoice_id = ?
  `,
    )
    .all(req.params.id);

  res.json({ ...bill, items });
}

function updateStatus(req, res) {
  try {
    const body = req.body ?? {};
    const { payment_status, paid_amount, payment_mode, paid_date } = body;

    const bill = db
      .prepare("SELECT id, total, status FROM invoice WHERE id = ?")
      .get(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (bill.status !== "active") {
      return res
        .status(400)
        .json({ message: "Only active bills can change payment status" });
    }

    if (payment_status === "unpaid") {
      db.prepare("DELETE FROM payments WHERE invoice_id = ?").run(req.params.id);
    } else if (paid_amount != null) {
      const targetPaid =
        payment_status === "paid" ? Number(bill.total ?? 0) : Number(paid_amount);
      if (Number.isNaN(targetPaid) || targetPaid < 0) {
        return res
          .status(400)
          .json({ message: "paid_amount must be a valid number" });
      }

      const currentPaid = Number(
        db
          .prepare(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE invoice_id = ?",
          )
          .get(req.params.id).total ?? 0,
      );
      const amountToAdd = targetPaid - currentPaid;
      if (amountToAdd > 0.0001) {
        db.prepare(
          `
          INSERT INTO payments (invoice_id, amount, mode, payment_date)
          VALUES (?, ?, ?, ?)
        `,
        ).run(
          req.params.id,
          amountToAdd,
          payment_mode ?? null,
          paid_date ?? new Date().toISOString().slice(0, 10),
        );
      }
    } else if (payment_mode !== undefined || paid_date !== undefined) {
      const latestPayment = db
        .prepare(
          `
          SELECT id
          FROM payments
          WHERE invoice_id = ?
          ORDER BY payment_date DESC, id DESC
          LIMIT 1
        `,
        )
        .get(req.params.id);

      if (latestPayment) {
        db.prepare(
          `
          UPDATE payments SET
            mode = COALESCE(?, mode),
            payment_date = COALESCE(?, payment_date)
          WHERE id = ?
        `,
        ).run(payment_mode ?? null, paid_date ?? null, latestPayment.id);
      } else {
        db.prepare(
          `
          UPDATE invoice SET
            payment_mode = COALESCE(?, payment_mode),
            paid_date = COALESCE(?, paid_date)
          WHERE id = ?
        `,
        ).run(payment_mode ?? null, paid_date ?? null, req.params.id);
      }
    }

    const invoice = recalculateInvoicePayment(req.params.id);
    res.json({ ok: true, invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
function getByStatus(req, res) {
  const { status } = req.params;
  const doc_type = req.query.doc_type || "INVOICE";

  // EDGE CASE: validate payment_status param so random strings don't hit the DB
  const valid = ["unpaid", "partial", "paid"];
  if (!valid.includes(status)) {
    return res
      .status(400)
      .json({ message: `status must be one of: ${valid.join(", ")}` });
  }

  const rows = db
    .prepare(
      `
    SELECT
      invoice.id, invoice.bill_number, invoice.bill_date,
      client.name AS client_name, invoice.total, invoice.payment_status,
      invoice.status
    FROM invoice
    JOIN client ON invoice.client_id = client.id
    WHERE invoice.payment_status = ?
      AND invoice.doc_type = ?
      AND invoice.status = 'active'
    ORDER BY invoice.created_at DESC
  `,
    )
    .all(status, doc_type);

  res.json(rows);
}

function convertToInvoice(req, res) {
  try {
    const result = convertTx(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

function getDescriptions(req, res) {
  const rows = db
    .prepare(
      `
    SELECT DISTINCT description
    FROM invoice_items
    WHERE TRIM(description) != ''
    ORDER BY description ASC
  `,
    )
    .all();
  res.json(rows.map((r) => r.description));
}

function unvoidBill(req, res) {
  db.prepare(`UPDATE invoice SET status = 'active' WHERE id = ? AND status = 'void'`)
    .run(req.params.id);
  res.json({ ok: true });
}

const updateBillTx = db.transaction((id, payload) => {
  db.prepare(`
    UPDATE invoice SET
      client_id      = ?,
      bill_date      = ?,
      due_date       = ?,
      payment_terms  = ?,
      notes          = ?,
      template       = ?,
      spacer_rows    = ?,
      subtotal       = ?,
      discount       = ?,
      tax_total      = ?,
      cgst           = ?,
      sgst           = ?,
      igst           = ?,
      is_igst        = ?,
      total          = ?,
      total_in_words = ?
    WHERE id = ?
  `).run(
    payload.client_id, payload.bill_date, payload.due_date ?? null,
    payload.payment_terms ?? null, payload.notes ?? null,
    payload.template, payload.spacer_rows ?? 3,
    payload.subtotal, payload.discount ?? 0, payload.tax_total ?? 0,
    payload.cgst ?? 0, payload.sgst ?? 0, payload.igst ?? 0,
    payload.is_igst ?? 0, payload.total, payload.total_in_words, id
  );
  db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(id);
  insertItems(id, payload.items);
});

function updateBill(req, res) {
  try {
    updateBillTx(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


module.exports = {
  createBill,
  finalizeDraft,
  voidBill,
  getNextNumber,
  getAll,
  getById,
  updateStatus,
  getByStatus,
  convertToInvoice,
  getDescriptions,
  unvoidBill,
  updateBill
};

