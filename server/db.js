const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Path relative to THIS file (server/db.js)
const DB_PATH = path.join(__dirname, "data", "app.db");

// Ensure folder exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

module.exports = db;