const express = require("express");
const router = express.Router();
const {
  addPayment,
  deletePayment,
  getPayments,
} = require("../controller/paymentController");

router.get("/:invoiceId", getPayments);
router.post("/", addPayment);
router.delete("/:id", deletePayment);

module.exports = router;
