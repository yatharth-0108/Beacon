const express = require("express");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const { factCheck, webSearchFactCheck } = require("../services/factCheckService");
const config = require("../config");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { text } = req.body || {};

  if (typeof text !== "string") {
    return res.status(400).json({ error: "Request body must include text." });
  }

  if (text.trim().length < 20 || text.trim().length > 20000) {
    return res.status(400).json({ error: "Text must be between 20 and 20000 characters." });
  }

  try {
    const result = await factCheck(text);
    return res.json(result);
  } catch (error) {
    console.error("Fact-check request failed:", error.message);
    return res.status(500).json({ error: "Fact-check service unavailable." });
  }
});

router.post("/websearch", requireAuth, async (req, res) => {
  const { text } = req.body || {};

  if (typeof text !== "string") {
    return res.status(400).json({ error: "Request body must include text." });
  }

  if (text.trim().length < 20 || text.trim().length > 20000) {
    return res.status(400).json({ error: "Text must be between 20 and 20000 characters." });
  }

  try {
    const account = await User.findById(req.user.userId)
      .select("isPremiumMember webSearchUsageCount")
      .lean();
    if (!account) return res.status(401).json({ error: "Login required" });

    const user = {
      ...req.user,
      _id: req.user.userId,
      isPremiumMember: account.isPremiumMember ?? false,
      webSearchUsageCount: account.webSearchUsageCount ?? 0,
    };
    const result = await webSearchFactCheck(text, user);
    if (result.limitReached) {
      return res.status(403).json({
        ...result,
        message: `You've used all ${config.freeWebSearchLimit} free web searches.`,
        upgradeUrl: "/premium",
      });
    }
    return res.json(result);
  } catch (error) {
    console.error("Web-search fact-check request failed:", error.message);
    return res.status(500).json({ error: "Web-search fact-check service unavailable." });
  }
});

module.exports = router;
