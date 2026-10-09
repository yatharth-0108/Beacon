const mongoose = require("mongoose");
const config = require("./config");

async function connectDB() {
  mongoose.connection.on("connected", () => {
    console.info("Connected to MongoDB.");
  });
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 1500,
  });
}

module.exports = connectDB;