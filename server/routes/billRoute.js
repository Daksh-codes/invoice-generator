const express = require("express");
const router = express.Router();
const {
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
  unvoidBill
} = require("../controller/billController");

// Specific routes first — before any /:id routes
router.get("/next-number/:issuer_id", getNextNumber);  // ?doc_type=INVOICE|QUOTATION
router.get("/status/:status", getByStatus);             // ?doc_type=INVOICE|QUOTATION

// to get unique descriptions from all table
router.get("/descriptions", getDescriptions);

// List & create
router.get("/", getAll);                                // ?doc_type=  &include_drafts=  &include_void=
router.post("/new/invoice", createBill("INVOICE"));
router.post("/new/quotation", createBill("QUOTATION"));

// Single bill actions — /:id routes LAST
router.get("/:id", getById);
router.put("/:id/status", updateStatus);
router.post("/:id/finalize", finalizeDraft);
router.post("/:id/void", voidBill);
router.post("/:id/unvoid", unvoidBill);
router.post("/:id/convert", convertToInvoice);



// No DELETE route — bills are never deleted

module.exports = router;