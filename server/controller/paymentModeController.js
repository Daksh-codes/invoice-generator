const db = require("../db");

function getAll(req, res) {
  const rows = db.prepare("SELECT label FROM payment_modes ORDER BY id ASC").all();
  res.json(rows.map(r => r.label));
}

function create(req, res) {
  const { label } = req.body;
  if (!label?.trim()) return res.status(400).json({ message: "Label required" });
  try {
    const id = db.prepare("INSERT INTO payment_modes (label) VALUES (?)").run(label.trim()).lastInsertRowid;
    res.json({ id, label: label.trim() });
  } catch (err) {
    res.status(409).json({ message: "Mode already exists" });
  }
}

module.exports = { getAll, create };