import fs from 'fs';
import axios from 'axios';
import chalk from 'chalk';
import figlet from 'figlet';

const DISCORD_API_BASE_URL = 'https://discord.com/api/v9';
const CONFIG_FILE_PATH = 'config/config.json';
const MESSAGES_FILE_PATH = 'config/chat.txt';

function displayWelcomeBanner() {
    console.log(chalk.blue(figlet.textSync('Discord Auto Chat', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 80,
        whitespaceBreak: true
    })));
    
    console.log(chalk.cyan('='.repeat(50)));
    console.log(chalk.cyan('Discord Auto Chat Bot v1.0'));
    console.log(chalk.cyan('Created by Your Name'));
    console.log(chalk.cyan('='.repeat(50)));
}

class DiscordAutoChat {
    constructor(token) {
        this.apiUrl = DISCORD_API_BASE_URL;
        this.headers = {
            'Authorization': token
        };
        this.userInfo = null;
    }

    async initialize() {
        this.userInfo = await this.fetchUserDetails();
        return this;
    }

    async fetchUserDetails() {
        try {
            const response = await axios.get(`${this.apiUrl}/users/@me`, {
                headers: this.headers
            });
            const { username, discriminator } = response.data;
            return `${username}#${discriminator}`;
        } catch (error) {
            throw new Error(`Failed to fetch user details: ${error.message}`);
        }
    }

    async sendChannelMessage(channelId, content) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/channels/${channelId}/messages`,
                { content },
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }
}

function loadConfigurationFile(configPath = CONFIG_FILE_PATH) {
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configContent);
    } catch (error) {
        throw new Error(`Failed to load configuration: ${error.message}`);
    }
}

function loadMessagesList(messagesPath = MESSAGES_FILE_PATH) {
    try {
        const messagesContent = fs.readFileSync(messagesPath, 'utf8');
        return messagesContent
            .split('\n')
            .map(message => message.trim())
            .filter(message => message.length > 0);
    } catch (error) {
        throw new Error(`Failed to load messages: ${error.message}`);
    }
}

// Add this after other const declarations
const lastSentMessages = new Map();

function getRandomMessage(messages, channelId) {
    const previousMessages = lastSentMessages.get(channelId) || [];
    let availableMessages = messages.filter(msg => !previousMessages.includes(msg));    
    if (availableMessages.length === 0) {
        availableMessages = messages;
        lastSentMessages.set(channelId, []);
    }
    const randomMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];    
    const updatedHistory = [...(lastSentMessages.get(channelId) || []), randomMessage];
    lastSentMessages.set(channelId, updatedHistory.slice(-5));    
    return randomMessage;
}

function validateConfiguration(config, messages) {
    if (!config.tokens || !Array.isArray(config.tokens)) {
        throw new Error('No bot tokens provided in config.json');
    }
    if (!config.channelIds || !Array.isArray(config.channelIds)) {
        throw new Error('No channel IDs provided in config.json');
    }
    if (!messages.length) {
        throw new Error('No messages found in chat.txt');
    }
}

async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function startAutoChatBot() {
    try {
        displayWelcomeBanner();
        // Load configuration and messages
        const config = loadConfigurationFile();
        const messages = loadMessagesList();
        validateConfiguration(config, messages);

        // Get delays from config
        const tokenDelay = config.tokenDelay || 5;
        const messageDelay = config.messageDelay || 20;
        const restartDelay = config.restartDelay || 30;

        while (true) {
            // Process each token
            for (const token of config.tokens) {
                try {
                    // Initialize bot instance
                    const bot = await new DiscordAutoChat(token).initialize();
                    // Process each channel
                    for (const channelId of config.channelIds) {
                        const randomMessage = getRandomMessage(messages, channelId);
                        const response = await bot.sendChannelMessage(channelId, randomMessage);
                        if (response.content) {
                            console.log(chalk.green(
                                `[INFO] [${bot.userInfo}] => Sent to Channel ${channelId}: ${randomMessage}`
                            ));
                        }
                        // Wait between messages
                        await sleep(messageDelay);
                    }
                    console.log(chalk.yellow(
                        `[INFO] Waiting ${tokenDelay} seconds before processing the next token...`
                    ));
                    await sleep(tokenDelay);
                } catch (error) {
                    console.error(chalk.red(
                        `[ERROR] Token processing failed: ${error.message}`
                    ));
                }
            }
            console.log(chalk.yellow(
                `[INFO] Waiting ${restartDelay} seconds before restarting...`
            ));
            await sleep(restartDelay);
        }
    } catch (error) {
        console.error(chalk.red(`[CRITICAL ERROR] ${error.message}`));
        process.exit(1);
    }
}

// Start the bot
startAutoChatBot().catch(error => {
    console.error(chalk.red(`[FATAL ERROR] ${error.message}`));
    process.exit(1);
});