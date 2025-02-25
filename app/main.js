import fs from "fs";
import axios from "axios";
import chalk from "chalk";
import figlet from "figlet";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  DiscordError,
  ErrorTypes,
  retryOperation,
} from "../utils/errorHandler.js";

const DISCORD_API_BASE_URL = "https://discord.com/api/v9";
const CONFIG_FILE_PATH = "config/config.json";
const MESSAGES_FILE_PATH = "config/chat.txt";

function displayWelcomeBanner() {
  console.log(
    chalk.blue(
      figlet.textSync("Discord Auto", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
        width: 80,
        whitespaceBreak: true,
      })
    )
  );

  console.log(chalk.cyan("=".repeat(50)));
  console.log(chalk.cyan("Discord Auto"));
  console.log(chalk.cyan("Created by Imamgg"));
  console.log(chalk.cyan("=".repeat(50)));
}

class DiscordAutoChat {
  constructor(token) {
    this.apiUrl = DISCORD_API_BASE_URL;
    this.headers = {
      Authorization: token,
    };
    this.userInfo = null;
    this.repliedMessages = new Set();
  }

  isOwnMessage(message) {
    return message.author.id === this.userId;
  }

  async initialize() {
    const userDetails = await this.fetchUserDetails();
    this.userInfo = `${userDetails.username}#${userDetails.discriminator}`;
    this.userId = userDetails.id;
    return this;
  }

  async fetchUserDetails() {
    try {
      return await retryOperation(async () => {
        const response = await axios.get(`${this.apiUrl}/users/@me`, {
          headers: this.headers,
        });
        return response.data;
      });
    } catch (error) {
      if (error.response?.status === 401) {
        throw new DiscordError("Invalid token", ErrorTypes.AUTH_ERROR);
      }
      throw new DiscordError(
        `Failed to fetch user details: ${error.message}`,
        ErrorTypes.API_ERROR,
        { originalError: error }
      );
    }
  }

  async sendChannelMessage(channelId, content) {
    try {
      return await retryOperation(async () => {
        const response = await axios.post(
          `${this.apiUrl}/channels/${channelId}/messages`,
          { content },
          { headers: this.headers }
        );
        return response.data;
      });
    } catch (error) {
      if (error.response?.status === 403) {
        throw new DiscordError(
          "No permission to send messages",
          ErrorTypes.AUTH_ERROR
        );
      }
      throw new DiscordError(
        `Failed to send message: ${error.message}`,
        ErrorTypes.API_ERROR,
        { channelId, originalError: error }
      );
    }
  }

  async fetchRecentMessages(channelId, limit = 50) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/channels/${channelId}/messages?limit=${limit}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }
  }

  async replyToMessage(channelId, messageId, content) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/channels/${channelId}/messages`,
        {
          content,
          message_reference: {
            message_id: messageId,
            channel_id: channelId,
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to reply to message: ${error.message}`);
    }
  }

  async generateAIReply(messageContent) {
    try {
      const chain = await this.createGeminiChain();
      const response = await retryOperation(async () => {
        return await chain.invoke({ message: messageContent });
      });
      return response;
    } catch (error) {
      console.error(chalk.red(`[GEMINI ERROR] ${error.message}`));
      throw new DiscordError(
        `AI generation failed: ${error.message}`,
        ErrorTypes.AI_ERROR,
        { messageContent }
      );
    }
  }

  async createGeminiChain() {
    const model = new ChatGoogleGenerativeAI({
      apiKey: this.config.googleApiKey,
      modelName: "gemini-pro",
      maxOutputTokens: 60,
      temperature: 0.7,
    });

    const prompt = PromptTemplate.fromTemplate(
      "Put yourself in the shoes of a human being. Never mention that you are an AI and never give an AI-like answer. Adapt your response based on the context of the conversation. Keep it interesting, friendly, relevant and keep your answers short. Respond to this message: {message}"
    );

    return prompt.pipe(model).pipe(new StringOutputParser());
  }
  getFallbackResponse() {
    const fallbackResponses = [
      "That's interesting!",
      "I see what you mean.",
      "Thanks for sharing!",
      "Cool!",
      "Interesting perspective!",
    ];
    return fallbackResponses[
      Math.floor(Math.random() * fallbackResponses.length)
    ];
  }

  async hasReplied(messageId) {
    if (this.repliedMessages.has(messageId)) {
      return true;
    }

    try {
      const messages = await this.fetchRecentMessages(channelId, 100);
      const hasReply = messages.some(
        (msg) =>
          msg.referenced_message &&
          msg.referenced_message.id === messageId &&
          this.isOwnMessage(msg)
      );

      if (hasReply) {
        this.repliedMessages.add(messageId);
      }

      return hasReply;
    } catch (error) {
      console.error(
        chalk.red(`[ERROR] Failed to check reply status: ${error.message}`)
      );
      return false;
    }
  }
}

function loadConfigurationFile(configPath = CONFIG_FILE_PATH) {
  try {
    const configContent = fs.readFileSync(configPath, "utf8");
    return JSON.parse(configContent);
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error.message}`);
  }
}

function loadMessagesList(messagesPath = MESSAGES_FILE_PATH) {
  try {
    const messagesContent = fs.readFileSync(messagesPath, "utf8");
    return messagesContent
      .split("\n")
      .map((message) => message.trim())
      .filter((message) => message.length > 0);
  } catch (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }
}

const lastSentMessages = new Map();

function getRandomMessage(messages, channelId) {
  const previousMessages = lastSentMessages.get(channelId) || [];
  let availableMessages = messages.filter(
    (msg) => !previousMessages.includes(msg)
  );
  if (availableMessages.length === 0) {
    availableMessages = messages;
    lastSentMessages.set(channelId, []);
  }
  const randomMessage =
    availableMessages[Math.floor(Math.random() * availableMessages.length)];
  const updatedHistory = [
    ...(lastSentMessages.get(channelId) || []),
    randomMessage,
  ];
  lastSentMessages.set(channelId, updatedHistory.slice(-5));
  return randomMessage;
}

function validateConfiguration(config, messages) {
  if (
    !config.tokens ||
    !Array.isArray(config.tokens) ||
    config.tokens.length === 0
  ) {
    throw new DiscordError(
      "No bot tokens provided in config.json",
      ErrorTypes.CONFIG_ERROR
    );
  }
  if (
    !config.channelIds ||
    !Array.isArray(config.channelIds) ||
    config.channelIds.length === 0
  ) {
    throw new DiscordError(
      "No channel IDs provided in config.json",
      ErrorTypes.CONFIG_ERROR
    );
  }
  if (!config.googleApiKey) {
    throw new DiscordError(
      "Google API key is missing in config.json",
      ErrorTypes.CONFIG_ERROR
    );
  }
  if (!messages.length) {
    throw new DiscordError(
      "No messages found in chat.txt",
      ErrorTypes.CONFIG_ERROR
    );
  }
}

async function generateContextualReply(bot, messageContent) {
  try {
    return await bot.generateAIReply(messageContent);
  } catch (error) {
    console.error(chalk.red(`[AI ERROR] ${error.message}`));
    return bot.getFallbackResponse();
  }
}

async function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function startAutoChatBot() {
  try {
    displayWelcomeBanner();
    const config = loadConfigurationFile();
    const messages = loadMessagesList();
    validateConfiguration(config, messages);

    const tokenDelay = config.tokenDelay || 5;
    const messageDelay = config.messageDelay || 20;
    const restartDelay = config.restartDelay || 30;

    while (true) {
      for (const token of config.tokens) {
        try {
          const bot = await new DiscordAutoChat(token).initialize();
          bot.config = config;
          for (const channelId of config.channelIds) {
            const shouldReply = Math.random() < 0.8; // 80% chance to reply

            if (shouldReply) {
              const recentMessages = await bot.fetchRecentMessages(
                channelId,
                20
              );
              const validMessages = recentMessages.filter(
                (msg) =>
                  !bot.isOwnMessage(msg) && !bot.repliedMessages.has(msg.id)
              );

              if (validMessages.length > 0) {
                const randomMessage =
                  validMessages[
                    Math.floor(Math.random() * validMessages.length)
                  ];

                if (!(await bot.hasReplied(randomMessage.id))) {
                  const reply = await generateContextualReply(
                    bot,
                    randomMessage.content
                  );
                  const response = await bot.replyToMessage(
                    channelId,
                    randomMessage.id,
                    reply
                  );

                  if (response.content) {
                    bot.repliedMessages.add(randomMessage.id);
                    console.log(
                      chalk.green(
                        `[INFO] [${bot.userInfo}] => AI Reply in Channel ${channelId}: ${reply}`
                      )
                    );
                  }
                }
              }
            } else {
              const randomMessage = getRandomMessage(messages, channelId);
              const response = await bot.sendChannelMessage(
                channelId,
                randomMessage
              );
              if (response.content) {
                console.log(
                  chalk.green(
                    `[INFO] [${bot.userInfo}] => Sent to Channel ${channelId}: ${randomMessage}`
                  )
                );
              }
            }
            await sleep(messageDelay);
          }
          console.log(
            chalk.yellow(
              `[INFO] Waiting ${tokenDelay} seconds before processing the next token...`
            )
          );
          await sleep(tokenDelay);
        } catch (error) {
          if (error instanceof DiscordError) {
            console.error(chalk.red(`[${error.type}] ${error.message}`));
            if (error.type === ErrorTypes.AUTH_ERROR) {
              console.error(
                chalk.yellow(`Skipping invalid token: ${token.slice(0, 10)}...`)
              );
              continue;
            }
          } else {
            console.error(chalk.red(`[UNEXPECTED ERROR] ${error.message}`));
          }
          await sleep(tokenDelay);
        }
      }
      console.log(
        chalk.yellow(
          `[INFO] Waiting ${restartDelay} seconds before restarting...`
        )
      );
      await sleep(restartDelay);
    }
  } catch (error) {
    if (error instanceof DiscordError) {
      console.error(
        chalk.red(`[CRITICAL ERROR] [${error.type}] ${error.message}`)
      );
      if (error.details) {
        console.error(
          chalk.gray("Error details:", JSON.stringify(error.details, null, 2))
        );
      }
    } else {
      console.error(chalk.red(`[FATAL ERROR] ${error.message}`));
    }
    process.exit(1);
  }
}

// Start the bot
startAutoChatBot().catch((error) => {
  console.error(chalk.red(`[FATAL ERROR] ${error.message}`));
  process.exit(1);
});
