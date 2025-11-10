// countTokens.js
const { encodingForModel } = require("tiktoken");

/**
 * Підрахунок кількості токенів для GPT-3.5-Turbo (Chat API)
 * @param {Array<{role: string, content: string, name?: string}>} messages
 * @param {string} modelName - Наприклад "gpt-3.5-turbo"
 * @returns {number} Кількість токенів
 */
function countChatTokens(messages, modelName = "gpt-3.5-turbo") {
  const encoding = encodingForModel(modelName);
  let tokens = 0;

  const tokensPerMessage = 4; // стандарт для GPT-3.5-Turbo
  const tokensPerName = 1;    // якщо є поле name

  messages.forEach(msg => {
    tokens += tokensPerMessage;
    for (const key in msg) {
      if (typeof msg[key] === "string") {
        tokens += encoding.encode(msg[key]).length;
      }
      if (key === "name") {
        tokens += tokensPerName;
      }
    }
  });

  tokens += 2; // завершальні токени
  encoding.free?.();
  return tokens;
}

// ===== Приклад використання =====
const messages = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Hello, how are you today?" }
];

const totalTokens = countChatTokens(messages);
console.log("Кількість токенів:", totalTokens);

module.exports = { countChatTokens };
