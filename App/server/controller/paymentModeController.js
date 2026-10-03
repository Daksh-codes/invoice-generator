const db = require("../db");

function normalizeLabel(label) {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

function getAll(req, res) {
  const rows = db
    .prepare("SELECT label FROM payment_modes ORDER BY id ASC")
    .all();
  res.json(
    rows.map((r) => ({
      label: r.label,
    })),
  );
}

function create(req, res) {
  const { label } = req.body ?? {};
  if (typeof label !== "string" || !label.trim()) {
    return res.status(400).json({ message: "Label required" });
  }
  const normalizedLabel = normalizeLabel(label);
  const titleCaseLabel = normalizedLabel.replace(
    /(^|[^\p{L}\p{N}])(\p{L})/gu,
    (_, prefix, letter) => prefix + letter.toUpperCase(),
  );
  try {
    const exists = db
      .prepare("SELECT label FROM payment_modes")
      .all()
      .some((mode) => normalizeLabel(mode.label) === normalizedLabel);
    if (exists) {
      return res.status(409).json({ message: "Mode already exists" });
    }
    const id = db
      .prepare("INSERT INTO payment_modes (label) VALUES (?)")
      .run(titleCaseLabel).lastInsertRowid;
    res.json({
      id,
      label: titleCaseLabel,
    });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ message: "Mode already exists" });
    }
    res.status(500).json({ message: "Failed to create payment mode" });
  }
}

module.exports = { getAll, create };
