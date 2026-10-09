const test = require("node:test");
const assert = require("node:assert/strict");

const config = require("../src/config");
const { fetchTopHeadlines, searchArticles } = require("../src/services/newsApiClient");

const originalApiKey = config.gnewsApiKey;
const originalFetch = global.fetch;

test.after(() => {
  config.gnewsApiKey = originalApiKey;
  global.fetch = originalFetch;
});

test("searchArticles queries GNews search and normalizes results", async () => {
  config.gnewsApiKey = "test-key";
  let requestedUrl;
  global.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({
        articles: [{
          title: "India headline",
          url: "https://example.com/india",
          source: { name: "Example News" },
          publishedAt: "2026-10-01T00:00:00Z",
          description: "A matching story",
        }],
      }),
    };
  };

  const articles = await searchArticles(" India ");

  assert.equal(requestedUrl.pathname, "/api/v4/search");
  assert.equal(requestedUrl.searchParams.get("q"), "India");
  assert.equal(requestedUrl.searchParams.get("apikey"), "test-key");
  assert.equal(articles[0].topic, "India");
  assert.equal(articles[0].source, "Example News");
});

test("fetchTopHeadlines keeps the feed on the headlines endpoint", async () => {
  config.gnewsApiKey = "test-key";
  let requestedUrl;
  global.fetch = async (url) => {
    requestedUrl = new URL(url);
    return { ok: true, json: async () => ({ articles: [] }) };
  };

  await fetchTopHeadlines();

  assert.equal(requestedUrl.pathname, "/api/v4/top-headlines");
});

test("searchArticles rejects when the GNews key is missing", async () => {
  config.gnewsApiKey = "";
  await assert.rejects(searchArticles("India"), /API key is not configured/);
});