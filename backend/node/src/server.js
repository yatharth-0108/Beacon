const app = require("./app");
const config = require("./config");
const connectDB = require("./db");
const { startNewsRefresh } = require("./jobs/refreshNews");
const { schedule: scheduleDigest } = require("./jobs/weeklyDigest");

async function startServer() {
  if (config.mongoUri) {
    try {
      await connectDB();
      startNewsRefresh();
      scheduleDigest();
    } catch (err) {
      console.warn("MongoDB connection skipped or failed:", err.message);
    }
  }
  app.listen(config.port, () => {
    console.info(`Express server listening on port ${config.port}.`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Express server:", error.message);
  process.exit(1);
});