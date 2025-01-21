## Discord Auto Chat

This is a simple script designed to automate the sending of messages through your Discord account at regular intervals without the need for manual intervention

### Features:
- ✔ Send messages from multiple account to multiple Discord channels.
- ✔ Customize message delays and token processing.

## Prerequisites
Before you begin, ensure you have the following installed:
- Node.js (version 14 or higher)
- npm (Node package manager)

## Installation

1. **Clone the repository** (or download the script):
    ```bash
    git clone https://github.com/Imamgg/discord-auto-chat.git 
    cd discord-auto-chat
    ```

2. **Install the required dependencies**:
    ```bash
    npm i
    ```

3. **Configure your `config.json`**:
    ```bash
    nano config/config.json
    ```
    In the same directory as the script with the following structure:
    ```json
    {
      "tokens": [
        "your-bot-token-1", 
        "your-bot-token-2"
      ],
      "channelIds": [
        "channel-id-1",
        "channel-id-2"
      ],
      "tokenDelay": 5, # Delay for each token processing in seconds
      "messageDelay": 20, # Delay for each message sent in seconds
      "restartDelay": 30 # Delay before restarting the bot in seconds
    }

4. **Configure the `chat.txt` file**:
    ```bash
    nano config/chat.txt
    ```
    With the messages you want the bot to send. Each message should be on a new line.

## How to Get Discord Token

### Method 1: Using Developer Console

1. **Open Discord in a Web Browser**
    - Navigate to [Discord Web](https://discord.com/app) and log in to your account.

2. **Access Developer Tools**
    - Right-click anywhere on the page and select **Inspect**, or press `Ctrl + Shift + I` (Windows/Linux) or `Cmd + Option + I` (Mac) to open the Developer Tools.
    - Go to the **Console** tab.

3. **Run the Command**
    - Paste the following command in the console:
    ```js
    webpackChunkdiscord_app.push([[""],{},req=>copy(Object.values(req.c).find(x => x?.exports?.default?.getToken).exports.default.getToken())])
    ```

4. **Retrieve the Token**
    - The token will be copied to your clipboard. Paste it into your desired location (e.g., `config.json`).

---

## Method 2: Using a URL Script

1. **Open Discord in a Web Browser**
   - Navigate to [Discord Web](https://discord.com/app) and log in to your account.

2. **Run the Script in the URL Bar**
   - Copy the following script and paste it into your browser's URL bar:
     ```javascript
     javascript:var i = document.createElement('iframe');i.onload = function(){var localStorage = i.contentWindow.localStorage;prompt('Your Discord token', localStorage.getItem('token').replace(/["]+/g, ''));};document.body.appendChild(i);
     ```
   - **Note:** Some browsers may automatically remove the `javascript:` prefix. If this happens, type it manually before pasting the rest of the script.

3. **Retrieve the Token**
   - A prompt will display your token. Copy it from the prompt and save it as needed.

## Usage

1. **Run the script**:
    ```bash
    npm run start
    ```
    or
    
    ```bash
    node app/main.js
    ```

2. **Customize your configuration**:
- You can modify the `config.json` file to add more tokens, channel IDs, and adjust delays as needed.
- If you wish to make further changes, feel free to explore and modify the script according to your preferences.