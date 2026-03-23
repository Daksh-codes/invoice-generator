const express = require("express");
const router = express.Router();
const { getAll, create } = require("../controller/paymentModeController");
router.get("/", getAll);
router.post("/", create);
module.exports = router;