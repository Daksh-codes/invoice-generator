const express = require("express");
const router = express.Router();
const {
  createClient,
  getAllClients,
  updateClient,
  deleteClient,
} = require("../controller/clientController");

router.post("/new", createClient);
router.get("/", getAllClients);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

module.exports = router;
