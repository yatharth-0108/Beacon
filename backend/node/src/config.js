const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  fastapiUrl: process.env.FASTAPI_URL || "http://localhost:8000",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  gnewsApiKey: process.env.GNEWS_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
  groqWebsearchModel: process.env.GROQ_WEBSEARCH_MODEL || "openai/gpt-oss-20b",
  freeWebSearchLimit: Number.parseInt(process.env.WEB_SEARCH_FREE_LIMIT || "5", 10),
  smtpUser: process.env.SMTP_USER,
  smtpAppPassword: process.env.SMTP_APP_PASSWORD,
};