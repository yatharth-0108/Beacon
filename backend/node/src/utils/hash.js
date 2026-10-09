const { createHash } = require("node:crypto");

function sha256(value) {
  return createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

module.exports = { sha256 };
