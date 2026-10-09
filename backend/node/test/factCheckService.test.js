const test = require("node:test");
const assert = require("node:assert/strict");

const config = require("../src/config");
const { Check } = require("../src/models/Check");
const NewsItem = require("../src/models/NewsItem");
const groqClient = require("../src/services/groqClient");
const { extractTopic, parseVerdict } = require("../src/services/factCheckService");
const factCheckServicePath = require.resolve("../src/services/factCheckService");
const originalFactCheckModule = require.cache[factCheckServicePath];

test("parseVerdict handles malformed model output without throwing", () => {
  const result = parseVerdict("This is a bad response without the required fields.", [
    { title: "First item", source: "Example News", url: "https://example.com/1", publishedAt: "2024-01-01" },
  ]);

  assert.equal(result.verdict, "unverifiable");
  assert.ok(result.explanation.length > 0);
  assert.deepEqual(result.sources, []);
});

test("extractTopic ignores generic wording around a specific topic", () => {
  assert.equal(extractTopic("About LPU college incident"), "lpu");
});

test("factCheck refreshes stale results and searches with the specific topic", async (t) => {
  const originalApiKey = config.gnewsApiKey;
  const originalFetch = global.fetch;
  const originalCheckFindOne = Check.findOne;
  const originalCheckFindOneAndUpdate = Check.findOneAndUpdate;
  const originalNewsFind = NewsItem.find;
  const originalChat = groqClient.chat;

  t.after(() => {
    config.gnewsApiKey = originalApiKey;
    global.fetch = originalFetch;
    Check.findOne = originalCheckFindOne;
    Check.findOneAndUpdate = originalCheckFindOneAndUpdate;
    NewsItem.find = originalNewsFind;
    groqClient.chat = originalChat;
    require.cache[factCheckServicePath] = originalFactCheckModule;
  });

  config.gnewsApiKey = "test-key";
  Check.findOne = () => ({
    lean: async () => ({
      factCheck: {
        verdict: "unverifiable",
        explanation: "Old result based on unrelated college stories.",
        sources: [],
      },
    }),
  });
  Check.findOneAndUpdate = async () => null;
  let newsQuery;
  let savedFactCheck;
  NewsItem.find = (query) => {
    newsQuery = query;
    return {
      sort() { return this; },
      limit() { return this; },
      lean: async () => [],
    };
  };
  Check.findOneAndUpdate = async (_filter, update) => {
    savedFactCheck = update.$set?.factCheck;
    return null;
  };

  let requestedUrl;
  global.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({
        articles: [{
          title: "LPU sexual assault allegations under investigation",
          url: "https://example.com/lpu",
          source: { name: "Example News" },
          publishedAt: "2026-10-01T00:00:00Z",
        }],
      }),
    };
  };
  groqClient.chat = async ([message]) => {
    assert.match(message.content, /LPU sexual assault allegations under investigation/);
    return "VERDICT: unverifiable\nEXPLANATION: Reports describe allegations under investigation, not a confirmed finding.\nSOURCES_USED: 1";
  };

  delete require.cache[factCheckServicePath];
  const { factCheck } = require("../src/services/factCheckService");
  const result = await factCheck("About LPU college incident");

  assert.equal(requestedUrl.pathname, "/api/v4/search");
  assert.equal(requestedUrl.searchParams.get("q"), "lpu");
  assert.equal(newsQuery.$or[0].title.$regex.source, "lpu");
  assert.equal(result.explanation, "Reports describe allegations under investigation, not a confirmed finding.");
  assert.equal(result.sources[0].url, "https://example.com/lpu");
  assert.equal(result.cached, false);
  assert.equal(savedFactCheck.contextTopic, "lpu");
});
