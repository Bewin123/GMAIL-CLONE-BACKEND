const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Email = require("../models/Email");

// POST route to compose email
router.post("/compose", authMiddleware, async (req, res) => {
  const { subject, body, recipients } = req.body;

  try {
    // Check if all required fields are provided
    if (!subject || !body || !recipients) {
      return res
        .status(400)
        .json({ msg: "Please provide subject, body, and recipients" });
    }

    // Create a new email instance
    const email = new Email({
      subject,
      body,
      recipients,
      sender: req.user.id,
    });

    // Save the email to the database
    await email.save();

    res.status(201).json({ msg: "Email composed successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Define other email routes here

module.exports = router;
