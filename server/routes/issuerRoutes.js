// routes/issuerRoutes.js
const express = require("express");
const router = express.Router();
const { upload, handleUploadError } = require("../middleware/multer");
const {
  createIssuer,
  getIssuerById,
  getAllIssuers,
  updateIssuer,
  deleteIssuer,
  changePrefix,
  getPrefixHistory,
  uploadLogo,
} = require("../controller/issuerController");

// Create firm — accepts multipart/form-data so logo can be included
router.post(
  "/new",
  (req, res, next) => upload.single("firm_logo")(req, res, next),
  handleUploadError,
  createIssuer,
);

router.get("/", getAllIssuers);
router.get("/:id", getIssuerById);
router.put("/:id", updateIssuer);
router.delete("/:id", deleteIssuer);
router.post("/:id/change-prefix", changePrefix);
router.get("/:id/prefix-history", getPrefixHistory);

// Update logo only
router.patch(
  "/:id/logo",
  (req, res, next) => upload.single("firm_logo")(req, res, next),
  handleUploadError,
  uploadLogo,
);

module.exports = router;