const nodemailer = require("nodemailer");
const config = require("../config");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.smtpUser,
    pass: config.smtpAppPassword,
  },
});

async function sendDigest(to, items) {
  if (!config.smtpUser || !config.smtpAppPassword) {
    throw new Error("SMTP credentials are not configured.");
  }

  const html = `
    <h2>This week's most-checked articles</h2>
    <ol>
      ${items
        .map(
          (item) => `
            <li>
              ${String(item.textPreview || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
              ${item.nlpLabel ? ` — <b>${item.nlpLabel}</b>` : ""}
              ${item.factCheck ? ` (fact-check: ${item.factCheck.verdict})` : ""}
              , checked ${item.checkCount || 0} times
            </li>
          `,
        )
        .join("")}
    </ol>
  `;

  return transporter.sendMail({
    from: config.smtpUser,
    to,
    subject: "Weekly Fake News Digest",
    html,
  });
}

module.exports = { sendDigest };
