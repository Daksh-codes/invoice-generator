const express = require("express");
const router = express.Router();
const {
  createQuotation,
  getAllQuotations,
  getQuotationById,
  getNextQuotationNumber,
  convertQuotationToInvoice,
} = require("../controller/quotationController");

router.post("/new", createQuotation);
router.get("/next-number/:issuer_id", getNextQuotationNumber);
router.get("/", getAllQuotations);
router.get("/:id", getQuotationById);
router.post("/:id/convert", convertQuotationToInvoice);

module.exports = router;
