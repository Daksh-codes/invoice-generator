const express = require("express");
const path = require("path");
const router = express.Router();
const { lineItemImageUpload, handleUploadError } = require("../middleware/multer");
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
  uploadLineItemImage,
  unvoidBill,
  updateBill
} = require("../controller/billController");

// Specific routes first — before any /:id routes
router.get("/next-number/:issuer_id", getNextNumber);  // ?doc_type=INVOICE|QUOTATION
router.get("/status/:status", getByStatus);             // ?doc_type=INVOICE|QUOTATION

// to get unique descriptions from all table
router.get("/descriptions", getDescriptions);
router.use(
  "/line-item-images",
  express.static(path.join(__dirname, "../uploads/line-item-images")),
);
router.post(
  "/line-item-image",
  (req, res, next) => lineItemImageUpload.single("line_item_image")(req, res, next),
  handleUploadError,
  uploadLineItemImage,
);

// List & create
router.get("/", getAll);                                // ?doc_type=  &include_drafts=  &include_void=
router.post("/new/invoice", createBill("INVOICE"));
router.post("/new/quotation", createBill("QUOTATION"));

// Single bill actions — /:id routes LAST
router.get("/:id", getById);
router.put("/:id", updateBill);
router.put("/:id/status", updateStatus);
router.post("/:id/finalize", finalizeDraft);
router.post("/:id/void", voidBill);
router.post("/:id/unvoid", unvoidBill);
router.post("/:id/convert", convertToInvoice);



// No DELETE route — bills are never deleted

module.exports = router;
