const test = require("node:test");
const assert = require("node:assert/strict");

const config = require("../src/config");
const { webSearchChat } = require("../src/services/groqClient");

test("webSearchChat requires browser search and logs executed tools", async (t) => {
  const originalApiKey = config.groqApiKey;
  const originalModel = config.groqWebsearchModel;
  const originalFetch = global.fetch;
  const originalInfo = console.info;
  let requestBody;
  let loggedTools;

  t.after(() => {
    config.groqApiKey = originalApiKey;
    config.groqWebsearchModel = originalModel;
    global.fetch = originalFetch;
    console.info = originalInfo;
  });

  config.groqApiKey = "test-key";
  config.groqWebsearchModel = "openai/gpt-oss-20b";
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "VERDICT: unverifiable", executed_tools: [{ type: "browser_search" }] } }],
      }),
    };
  };
  console.info = (_message, tools) => { loggedTools = JSON.parse(tools); };

  const result = await webSearchChat([{ role: "user", content: "Search this claim." }]);

  assert.equal(requestBody.model, "openai/gpt-oss-20b");
  assert.equal(requestBody.tool_choice, "required");
  assert.deepEqual(requestBody.tools, [{ type: "browser_search" }]);
  assert.equal(requestBody.temperature, 1);
  assert.equal(requestBody.max_completion_tokens, 2048);
  assert.equal(result, "VERDICT: unverifiable");
  assert.deepEqual(loggedTools, [{ type: "browser_search" }]);
});