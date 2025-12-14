# Discord Bot with Interactive AI

A powerful Discord bot powered by Groq AI with interactive chat mode, file analysis (PDF & images), and smart conversation memory.

## 🔗 Try It Live!

**Join our Discord server to see the bot in action:**  
[https://discord.gg/kThqhjgj](https://discord.gg/kThqhjgj)

The bot is hosted 24/7 on Replit for free!

## Features

✨ **Interactive Chat Mode** - Enter `!chat` to start a continuous conversation where the bot remembers everything  
📄 **PDF Analysis** - Upload PDFs and get instant summaries and insights  
🖼️ **Image Analysis** - Upload images for detailed AI-powered descriptions  
💬 **Shared History** - Multiple users can chat in the same channel with shared context  
⚡ **Lightning Fast** - Powered by Groq's ultra-fast LLaMA models (FREE!)  
🧠 **Smart Responses** - Local knowledge base for instant answers to common questions

## Commands

| Command | Description |
|---------|-------------|
| `!ask [question]` | Ask a one-time question (no history) |
| `!chat [message]` | Enter interactive mode - just type naturally! |
| `!exit` | Exit interactive chat mode |
| `!clear` | Clear conversation history & exit chat mode |
| `!ping` | Check bot latency |
| `@mention` | Mention the bot to get a response |
| **Upload files** | Just upload a PDF or image with optional message |

## Setup

### Prerequisites
- Node.js (v16 or higher)
- Discord Bot Token
- Groq API Key (FREE at [console.groq.com](https://console.groq.com))

### Installation

1. Clone this repository:
```bash
git clone https://github.com/MeyaElyes/discord-bot-with-interactive-ai.git
cd discord-bot-with-interactive-ai
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your credentials:
```env
DISCORD_TOKEN=your_discord_bot_token_here
GROQ_API_KEY=your_groq_api_key_here
```

4. Run the bot:
```bash
npm start
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** tab and create a bot
4. Enable these **Privileged Gateway Intents**:
   - ✅ Message Content Intent
   - ✅ Guild Messages
5. Copy the bot token and add it to your `.env` file
6. Go to **OAuth2 > URL Generator**:
   - Scopes: `bot`
   - Permissions: `Send Messages`, `Read Messages`, `Embed Links`, `Attach Files`
7. Use the generated URL to invite the bot to your server

## Groq API Setup

1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key (it's FREE!)
3. Add it to your `.env` file

## Hosting on Replit (Free 24/7)

1. Fork this repo to your GitHub account
2. Go to [Replit](https://replit.com) and create a new Repl
3. Import from GitHub (select your forked repo)
4. Add secrets in Replit:
   - `DISCORD_TOKEN` = your bot token
   - `GROQ_API_KEY` = your Groq API key
5. Click Run!
6. Use **Always On** or **UptimeRobot** to keep it running 24/7

## Technologies

- **Discord.js** - Discord API wrapper
- **Groq SDK** - Ultra-fast AI inference
- **pdf-parse** - PDF text extraction
- **sharp** - Image processing
- **axios** - HTTP requests

## Models Used

- **Text**: LLaMA 3.3 70B Versatile
- **Vision**: LLaMA 3.2 11B Vision Preview

## License

MIT

## Credits

Created by [ilyesmaya_123](https://github.com/MeyaElyes)
