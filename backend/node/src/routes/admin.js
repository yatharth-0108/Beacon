const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { runDigest } = require("../jobs/weeklyDigest");

const router = express.Router();

router.post("/run-digest", requireAuth, async (req, res) => {
  try {
    const result = await runDigest();
    return res.json(result);
  } catch (error) {
    console.error("Manual digest trigger failed:", error.message);
    return res.status(500).json({ error: "Digest job failed." });
  }
});

module.exports = router;
