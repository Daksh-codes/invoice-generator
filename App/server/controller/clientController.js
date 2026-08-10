const db = require("../db");

const insertClientStmt = db.prepare(`
  INSERT INTO client (name, address, phone, email, gstin)
  VALUES (?, ?, ?, ?, ?)
`);

const updateClientStmt = db.prepare(`
  UPDATE client SET
    name = ?,
    address = ?,
    phone = ?,
    email = ?,
    gstin = ?
  WHERE id = ?
`);

const createClientTx = db.transaction((payload) => {
  return insertClientStmt.run(
    payload.name.trim(),
    payload.address?.trim() || null,
    payload.phone?.trim() || null,
    payload.email?.trim() || null,
    payload.gstin?.trim()?.toUpperCase() || null,
  ).lastInsertRowid;
});

const updateClientTx = db.transaction((id, payload) => {
  return updateClientStmt.run(
    payload.name.trim(),
    payload.address?.trim() || null,
    payload.phone?.trim() || null,
    payload.email?.trim() || null,
    payload.gstin?.trim()?.toUpperCase() || null,
    id,
  ).changes;
});

const deleteClientTx = db.transaction((id) => {
  const hasInvoices = db.prepare(
    "SELECT 1 FROM invoice WHERE client_id = ? LIMIT 1",
  ).get(id);

  if (hasInvoices) {
    const err = new Error("Cannot delete client with existing invoices");
    err.statusCode = 409;
    throw err;
  }

  return db.prepare("DELETE FROM client WHERE id = ?").run(id).changes;
});

function createClient(req, res) {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ message: "Client name is required" });
    }
    const id = createClientTx(req.body);
    res.json({ id });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || "Failed to create client" });
  }
}

function getAllClients(req, res) {
  const clients = db.prepare("SELECT * FROM client ORDER BY name ASC").all();
  res.json(clients);
}

function getClientById(req, res) {
  const client = db.prepare("SELECT * FROM client WHERE id = ?").get(req.params.id);
  if (!client) return res.status(404).json({ message: "Client not found" });
  res.json(client);
}

function updateClient(req, res) {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ message: "Client name is required" });
    }
    const changes = updateClientTx(req.params.id, req.body);
    if (!changes) return res.status(404).json({ message: "Client not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || "Failed to update client" });
  }
}

function deleteClient(req, res) {
  try {
    const changes = deleteClientTx(req.params.id);
    if (!changes) return res.status(404).json({ message: "Client not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || "Failed to delete client" });
  }
}

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
};