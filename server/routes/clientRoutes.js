const express = require("express");
const router = express.Router();
const db = require("../db");

// CREATE
router.post("/new", (req, res) => {
  const { name } = req.body;

  const result = db.prepare(`
    INSERT INTO client (name) VALUES (?)
  `).run(name);

  res.json({ id: result.lastInsertRowid });
});

// READ all
router.get("/", (req, res) => {
  const clients = db.prepare("SELECT * FROM client").all();
  res.json(clients);
});

// UPDATE
router.put("/:id", (req, res) => {
  const { name } = req.body;

  db.prepare(`
    UPDATE client SET name = ? WHERE id = ?
  `).run(name, req.params.id);

  res.json({ success: true });
});

// DELETE
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM client WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
