// routes/bankRoutes.js
const express = require("express");
const router = express.Router();
const { upload, handleUploadError } = require("../middleware/multer");
const {
  createBank,
  getBankByIssuer,
  getBankById,
  getAllBankNames,
  updateBank,
  deleteBank,
  uploadQr,
} = require("../controller/bankController");

// Create bank — accepts multipart/form-data so QR can be included
router.post(
  "/",
  (req, res, next) => upload.single("bank_qr")(req, res, next),
  handleUploadError,
  createBank,
);

router.get("/names", getAllBankNames);
router.get("/issuer/:issuer_id", getBankByIssuer);
router.get("/:id", getBankById);
router.put("/:id", updateBank);
router.delete("/:id", deleteBank);

// Update QR only
router.patch(
  "/:id/qr",
  (req, res, next) => upload.single("bank_qr")(req, res, next),
  handleUploadError,
  uploadQr,
);

module.exports = router;