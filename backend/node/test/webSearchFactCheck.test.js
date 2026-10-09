const test = require("node:test");
const assert = require("node:assert/strict");

const config = require("../src/config");
const { Check } = require("../src/models/Check");
const User = require("../src/models/User");
const groqClient = require("../src/services/groqClient");
const servicePath = require.resolve("../src/services/factCheckService");
const originalServiceModule = require.cache[servicePath];

test("parseWebSearchVerdict extracts a verdict and only valid source URLs", () => {
  const { parseWebSearchVerdict } = require("../src/services/factCheckService");
  const result = parseWebSearchVerdict("VERDICT: likely true\nEXPLANATION: Two reports support the claim.\nSOURCES:\nhttps://example.com/story,\nnot-a-url");

  assert.equal(result.verdict, "likely true");
  assert.equal(result.explanation, "Two reports support the claim.");
  assert.deepEqual(result.sources, ["https://example.com/story"]);
});

test("webSearchFactCheck caches the result and skips Groq on repeat", async (t) => {
  const originalFindOne = Check.findOne;
  const originalFindOneAndUpdate = Check.findOneAndUpdate;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalWebSearchChat = groqClient.webSearchChat;
  const originalModel = config.groqWebsearchModel;
  const originalLimit = config.freeWebSearchLimit;
  const user = { _id: "free-user", isPremiumMember: false, webSearchUsageCount: 4 };
  let savedResult;
  let callCount = 0;

  t.after(() => {
    Check.findOne = originalFindOne;
    Check.findOneAndUpdate = originalFindOneAndUpdate;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    groqClient.webSearchChat = originalWebSearchChat;
    config.groqWebsearchModel = originalModel;
    config.freeWebSearchLimit = originalLimit;
    require.cache[servicePath] = originalServiceModule;
  });

  config.groqWebsearchModel = "openai/gpt-oss-20b";
  config.freeWebSearchLimit = 5;
  Check.findOne = () => ({ lean: async () => savedResult ? { webSearchResult: savedResult } : null });
  Check.findOneAndUpdate = async (_filter, update) => {
    if (update.$set?.webSearchResult) savedResult = update.$set.webSearchResult;
    return null;
  };
  User.findOneAndUpdate = async (_filter, update) => {
    user.webSearchUsageCount += update.$inc.webSearchUsageCount;
    return user;
  };
  groqClient.webSearchChat = async ([message]) => {
    callCount += 1;
    assert.match(message.content, /Search the live web/);
    return "VERDICT: likely false\nEXPLANATION: Reputable reports contradict the article.\nSOURCES: https://example.com/report";
  };

  delete require.cache[servicePath];
  const { webSearchFactCheck } = require("../src/services/factCheckService");
  const first = await webSearchFactCheck("A sufficiently long article text to fact check.", user);
  const second = await webSearchFactCheck("A sufficiently long article text to fact check.", user);

  assert.equal(first.verdict, "likely false");
  assert.deepEqual(first.sources, ["https://example.com/report"]);
  assert.equal(first.model, "openai/gpt-oss-20b");
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(callCount, 1);
  assert.equal(user.webSearchUsageCount, 5);
});

test("webSearchFactCheck returns unavailable instead of throwing on Groq errors", async (t) => {
  const originalFindOne = Check.findOne;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalUserUpdateOne = User.updateOne;
  const originalWebSearchChat = groqClient.webSearchChat;
  const user = { _id: "free-user", isPremiumMember: false, webSearchUsageCount: 0 };
  let rollbackCount = 0;

  t.after(() => {
    Check.findOne = originalFindOne;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    User.updateOne = originalUserUpdateOne;
    groqClient.webSearchChat = originalWebSearchChat;
    require.cache[servicePath] = originalServiceModule;
  });

  Check.findOne = () => ({ lean: async () => null });
  User.findOneAndUpdate = async (_filter, update) => {
    user.webSearchUsageCount += update.$inc.webSearchUsageCount;
    return user;
  };
  User.updateOne = async (_filter, update) => {
    rollbackCount += 1;
    user.webSearchUsageCount += update.$inc.webSearchUsageCount;
  };
  groqClient.webSearchChat = async () => { throw new Error("upstream failed"); };

  delete require.cache[servicePath];
  const { webSearchFactCheck } = require("../src/services/factCheckService");
  const result = await webSearchFactCheck("A sufficiently long article text to fact check.", user);

  assert.deepEqual(result, {
    verdict: "unavailable",
    explanation: "Web search is temporarily unavailable. Please try again later.",
    sources: [],
    cached: false,
  });
  assert.equal(rollbackCount, 1);
  assert.equal(user.webSearchUsageCount, 0);
});

test("webSearchFactCheck stops a free user at the lifetime limit without calling Groq", async (t) => {
  const originalFindOne = Check.findOne;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalWebSearchChat = groqClient.webSearchChat;
  const originalLimit = config.freeWebSearchLimit;
  const user = { _id: "free-user", isPremiumMember: false, webSearchUsageCount: 5 };

  t.after(() => {
    Check.findOne = originalFindOne;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    groqClient.webSearchChat = originalWebSearchChat;
    config.freeWebSearchLimit = originalLimit;
    require.cache[servicePath] = originalServiceModule;
  });

  config.freeWebSearchLimit = 5;
  Check.findOne = () => ({ lean: async () => null });
  User.findOneAndUpdate = async () => { throw new Error("Quota should be checked before reservation"); };
  groqClient.webSearchChat = async () => { throw new Error("Groq must not be called"); };

  delete require.cache[servicePath];
  const { webSearchFactCheck } = require("../src/services/factCheckService");
  const result = await webSearchFactCheck("A new article beyond the free quota.", user);

  assert.deepEqual(result, { limitReached: true, used: 5, limit: 5 });
});

test("webSearchFactCheck does not count cache hits against a full free quota", async (t) => {
  const originalFindOne = Check.findOne;
  const originalCheckFindOneAndUpdate = Check.findOneAndUpdate;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalWebSearchChat = groqClient.webSearchChat;
  const user = { _id: "free-user", isPremiumMember: false, webSearchUsageCount: 5 };

  t.after(() => {
    Check.findOne = originalFindOne;
    Check.findOneAndUpdate = originalCheckFindOneAndUpdate;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    groqClient.webSearchChat = originalWebSearchChat;
    require.cache[servicePath] = originalServiceModule;
  });

  const cachedResult = { verdict: "likely true", explanation: "Cached.", sources: [] };
  Check.findOne = () => ({ lean: async () => ({ webSearchResult: cachedResult }) });
  Check.findOneAndUpdate = async () => null;
  User.findOneAndUpdate = async () => { throw new Error("Cache hits must not change usage"); };
  groqClient.webSearchChat = async () => { throw new Error("Cache hit must not call Groq"); };

  delete require.cache[servicePath];
  const { webSearchFactCheck } = require("../src/services/factCheckService");
  const result = await webSearchFactCheck("An article with a cached result.", user);

  assert.equal(result.cached, true);
  assert.equal(result.verdict, "likely true");
});

test("webSearchFactCheck allows premium users without incrementing usage", async (t) => {
  const originalFindOne = Check.findOne;
  const originalCheckFindOneAndUpdate = Check.findOneAndUpdate;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalWebSearchChat = groqClient.webSearchChat;
  const user = { _id: "premium-user", isPremiumMember: true, webSearchUsageCount: 5 };
  let groqCalls = 0;

  t.after(() => {
    Check.findOne = originalFindOne;
    Check.findOneAndUpdate = originalCheckFindOneAndUpdate;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    groqClient.webSearchChat = originalWebSearchChat;
    require.cache[servicePath] = originalServiceModule;
  });

  Check.findOne = () => ({ lean: async () => null });
  Check.findOneAndUpdate = async () => null;
  User.findOneAndUpdate = async () => { throw new Error("Premium usage must not be incremented"); };
  groqClient.webSearchChat = async () => {
    groqCalls += 1;
    return "VERDICT: unverifiable\nEXPLANATION: No confirmation found.\nSOURCES: none";
  };

  delete require.cache[servicePath];
  const { webSearchFactCheck } = require("../src/services/factCheckService");
  const result = await webSearchFactCheck("A premium user's next new search.", user);

  assert.equal(result.verdict, "unverifiable");
  assert.equal(result.cached, false);
  assert.equal(groqCalls, 1);
  assert.equal(user.webSearchUsageCount, 5);
});