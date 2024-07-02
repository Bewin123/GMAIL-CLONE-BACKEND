const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/emails", require("./emailRoutes"));

module.exports = router;
