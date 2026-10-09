const config = require("../config");

function normalizeArticle(article, topic = "") {
  const sourceName = article?.source?.name || article?.source || "Unknown";
  return {
    title: article?.title || "Untitled",
    url: article?.url || article?.link || "",
    source: sourceName,
    publishedAt: article?.publishedAt || article?.published_at || new Date().toISOString(),
    topic: topic || "general",
    snippet: article?.description || article?.content || "",
  };
}

async function fetchArticles(endpoint, params, topic) {
  if (!config.gnewsApiKey) {
    throw new Error("GNews API key is not configured");
  }

  const url = new URL(`https://gnews.io/api/v4/${endpoint}`);
  url.searchParams.set("lang", "en");
  url.searchParams.set("apikey", config.gnewsApiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GNews error ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data.articles) ? data.articles.map((article) => normalizeArticle(article, topic)) : [];
}

function fetchTopHeadlines(topic = "") {
  return fetchArticles("top-headlines", topic ? { q: topic } : {}, topic);
}

function searchArticles(query) {
  const topic = String(query || "").trim();
  return topic ? fetchArticles("search", { q: topic }, topic) : Promise.resolve([]);
}

module.exports = { fetchTopHeadlines, searchArticles, normalizeArticle };
