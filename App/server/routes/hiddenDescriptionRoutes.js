const express = require("express");
const router = express.Router();
const {
  hideDescription,
} = require("../controller/hiddenDescriptionController");

router.post("/", hideDescription);

module.exports = router;
