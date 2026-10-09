const mongoose = require("mongoose");

const newsItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true, unique: true, index: true },
  source: { type: String, default: "Unknown" },
  publishedAt: { type: Date, default: Date.now },
  fetchedAt: { type: Date, default: Date.now },
  topic: { type: String, default: "general" },
  snippet: { type: String, default: "" },
});

const NewsItem = mongoose.model("NewsItem", newsItemSchema);

module.exports = NewsItem;
