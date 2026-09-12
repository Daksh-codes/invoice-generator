const db = require("../db");

function hideDescription(req, res) {
  const description = req.body.description?.trim();

  if (!description) {
    return res.status(400).json({ message: "description is required" });
  }

  db.prepare(
    "INSERT OR IGNORE INTO hidden_descriptions (description) VALUES (?)",
  ).run(description);

  res.json({ success: true, description });
}

module.exports = {
  hideDescription,
};
