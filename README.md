<div align="center">
   <a href="https://github.com/Prevter/FloatTool">
      <img src="docs/Icon.svg" alt="Logo" width="80" height="80">
   </a>
   <h3 align="center">AYNT Bot</h3>
   <p align="center">
      AYNT Bot is a Telegram bot designed to help users easily download videos from various social media platforms such as YouTube, TikTok, Instagram, and Twitter.
   </p>
</div>

## Introduction
AYNT Bot is powered by the Telegraf library and allows users to send video URLs from supported platforms to the bot. The bot then downloads the videos from these URLs and sends them back to the user in telegram. The supported platforms include YouTube, TikTok, Instagram, and Twitter.

## Getting Started
Make sure you have Node.js installed on your system.
Install all requirements using npm:
```
npm i
```
Create a .env file in the root directory and add your bot token:

```
BOT_TOKEN=your_bot_token_here
```
If you're running a local server to increase limit from 50 MB to 2 GB, also add the local server URL:

```
LOCAL_SERVER=http://127.0.0.1:8081
```
How to use local telegram bot api: https://github.com/tdlib/telegram-bot-api

## Start the bot:
```
npm start
```
Interact with the bot in your Telegram app. Start a chat with the bot and send it URLs from supported platforms. The bot will download and send back the videos.

## Commands
- `/start` - Initiates a conversation with the bot.
- `/help` - Displays a help message with information on how to use the bot.

## License
AYNT Bot is open-source software licensed under the MIT License. Feel free to use, modify, and distribute the code as per the terms of the license.