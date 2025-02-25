class DiscordError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = "DiscordError";
    this.type = type;
    this.details = details;
  }
}

const ErrorTypes = {
  API_ERROR: "API_ERROR",
  RATE_LIMIT: "RATE_LIMIT",
  AUTH_ERROR: "AUTH_ERROR",
  CONFIG_ERROR: "CONFIG_ERROR",
  AI_ERROR: "AI_ERROR",
};

async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers["retry-after"] || delay;
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      } else {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

export { DiscordError, ErrorTypes, retryOperation };
