const express = require("express");
const router = express.Router();
const {
  createInvoice,
  getNextInvoiceNumber,
  getAllInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  getInvoicesByStatus,
} = require("../controller/invoiceController");

router.post("/new", createInvoice);
router.get("/next-number/:issuer_id", getNextInvoiceNumber);
router.get("/status/:status", getInvoicesByStatus);
router.get("/", getAllInvoices);
router.get("/:id", getInvoiceById);
router.put("/:id/status", updateInvoiceStatus);

module.exports = router;
