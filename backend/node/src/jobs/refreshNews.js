const NewsItem = require("../models/NewsItem");
const { fetchTopHeadlines } = require("../services/newsApiClient");
const config = require("../config");

async function syncNews(topic = "") {
  if (!config.gnewsApiKey) {
    console.warn("GNews API key missing; skipping news refresh.");
    return [];
  }

  const articles = await fetchTopHeadlines(topic);
  const savedItems = [];

  for (const article of articles) {
    if (!article.url) continue;

    const item = await NewsItem.findOneAndUpdate(
      { url: article.url },
      {
        title: article.title,
        source: article.source,
        publishedAt: article.publishedAt,
        fetchedAt: new Date(),
        topic: article.topic || topic || "general",
        snippet: article.snippet || "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    savedItems.push(item.toObject ? item.toObject() : item);
  }

  return savedItems;
}

function startNewsRefresh() {
  // Why: cache the feed once on startup and refresh on a timer so GNews quota is used
  // sparingly instead of burning one request every time a user opens the page.
  syncNews().catch((error) => {
    console.error("Initial news refresh failed:", error.message);
  });

  setInterval(() => {
    syncNews().catch((error) => {
      console.error("Scheduled news refresh failed:", error.message);
    });
  }, 2 * 60 * 60 * 1000);
}

module.exports = { syncNews, startNewsRefresh };
