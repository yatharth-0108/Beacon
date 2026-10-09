const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config");

const router = express.Router();
const MAX_DISPLAY_NAME_LENGTH = 60;
const MAX_PROFILE_IMAGE_URL_LENGTH = 500;

function validProfileImageUrl(value) {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value !== "string" || value.trim().length > MAX_PROFILE_IMAGE_URL_LENGTH) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signToken(user) {
  return jwt.sign({ userId: user._id, email: user.email }, config.jwtSecret, {
    expiresIn: "7d",
  });
}

router.post("/register", async (req, res) => {
  const { email, password, displayName = "", profileImageUrl = "" } = req.body || {};

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  if (typeof displayName !== "string" || displayName.trim().length > MAX_DISPLAY_NAME_LENGTH) {
    return res.status(400).json({ error: "Display name must be 60 characters or fewer." });
  }

  if (!validProfileImageUrl(profileImageUrl)) {
    return res.status(400).json({ error: "Profile image must be a valid HTTP or HTTPS URL under 500 characters." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ error: "Email already registered." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName.trim(),
      profileImageUrl: typeof profileImageUrl === "string" ? profileImageUrl.trim() : "",
    });
    const token = signToken(user);

    res.cookie("token", token, getCookieOptions());
    return res.status(201).json({ email: user.email, displayName: user.displayName, profileImageUrl: user.profileImageUrl });
  } catch (error) {
    console.error("Registration failed:", error.message);
    return res.status(500).json({ error: "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.comparePassword(normalizedEmail, password);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  res.cookie("token", token, getCookieOptions());
  return res.json({ email: user.email });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({});
});

router.get("/me", async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  const user = await User.findById(req.user.userId).lean();
  return res.json({
    email: user?.email || req.user.email,
    displayName: user?.displayName || "",
    profileImageUrl: user?.profileImageUrl || "",
    emailOptIn: user?.emailOptIn ?? true,
    isPremiumMember: user?.isPremiumMember ?? false,
    webSearchUsageCount: user?.webSearchUsageCount ?? 0,
    webSearchFreeLimit: config.freeWebSearchLimit,
  });
});

router.patch("/profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Login required" });
  }

  const { displayName, profileImageUrl = "" } = req.body || {};
  if (typeof displayName !== "string" || displayName.trim().length === 0 || displayName.trim().length > MAX_DISPLAY_NAME_LENGTH) {
    return res.status(400).json({ error: "Display name must be between 1 and 60 characters." });
  }

  if (!validProfileImageUrl(profileImageUrl)) {
    return res.status(400).json({ error: "Profile image must be a valid HTTP or HTTPS URL under 500 characters." });
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $set: { displayName: displayName.trim(), profileImageUrl: profileImageUrl.trim() } },
    { new: true, runValidators: true },
  );

  if (!user) return res.status(401).json({ error: "Login required" });
  return res.json({ email: user.email, displayName: user.displayName, profileImageUrl: user.profileImageUrl });
});

router.post("/email-opt-in", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Login required" });
  }

  const { emailOptIn } = req.body || {};
  if (typeof emailOptIn !== "boolean") {
    return res.status(400).json({ error: "emailOptIn must be a boolean." });
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { emailOptIn },
    { new: true, runValidators: true },
  );

  return res.json({ email: user.email, emailOptIn: user.emailOptIn });
});

module.exports = router;
