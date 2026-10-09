const cron = require("node-cron");
const config = require("../config");
const { Check } = require("../models/Check");
const User = require("../models/User");
const { sendDigest } = require("../services/mailer");

async function runDigest() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const top = await Check.find({ lastCheckedAt: { $gte: since } })
    .sort({ checkCount: -1, lastCheckedAt: -1 })
    .limit(5)
    .lean();

  if (top.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  if (!config.smtpUser || !config.smtpAppPassword) {
    console.warn("SMTP credentials are not configured; skipping weekly digest send.");
    return { sent: 0, skipped: 0, reason: "SMTP credentials missing" };
  }

  const users = await User.find({ emailOptIn: true }).lean();
  let sent = 0;

  for (const user of users) {
    try {
      await sendDigest(user.email, top);
      sent += 1;
    } catch (error) {
      console.error(`Digest failed for ${user.email}:`, error.message);
    }
  }

  return { sent, skipped: users.length - sent };
}

function schedule() {
  cron.schedule("0 9 * * 1", runDigest);
}

module.exports = { schedule, runDigest };
