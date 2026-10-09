const config = require("../config");

async function chat(messages) {
  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function webSearchChat(messages) {
  if (!config.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify({
      model: config.groqWebsearchModel,
      messages,
      tool_choice: "required",
      tools: [{ type: "browser_search" }],
      temperature: 1,
      max_completion_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq web search error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const executedTools = message?.executed_tools ?? data.executed_tools ?? [];
  console.info("Groq web search executed_tools:", JSON.stringify(executedTools));
  return message?.content || "";
}

module.exports = { chat, webSearchChat };
