// Discord Bot with Groq Integration + File Analysis (FREE & FAST!)
// Install dependencies: npm install discord.js groq-sdk dotenv axios pdf-parse sharp

require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Groq = require('groq-sdk');
const axios = require('axios');
const pdf = require('pdf-parse');
const sharp = require('sharp');

// Initialize Groq (FREE & super fast!)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Store conversation history per channel (SHARED across all users in that channel!)
const conversations = new Map();

// Track channels in interactive chat mode with user ID using Set of "channelId:userId"
const interactiveModeChannels = new Set();

// Bot configuration
const CONFIG = {
  prefix: '!',
  maxHistoryLength: 10,
  model: 'llama-3.3-70b-versatile', // Free & powerful!
  visionModel: 'llama-3.2-11b-vision-preview', // For images (updated working model)
  systemPrompt: 'You are a helpful Discord bot assistant. Be concise, friendly, and safe.'
};

// Local knowledge base - bot checks this BEFORE calling API
const LOCAL_RESPONSES = {
  // Exact matches (case-insensitive)
  "hello": "Hello! How can I assist you today?",
  "hi": "Hi there! What can I do for you?",
  "help": "Sure! You can use commands like `!ask`, `!chat`, `!clear`, and more. Type `!help` to see all commands.",

  // Keyword-based responses (checks if message contains these keywords)
  keywords: {
    // Add more keyword responses here
  },
  
  // Pattern-based responses (using regex)
  patterns: [
    {
      regex: /what (is|are) (the )?server (ip|address)/i,
      response: 'Our server IP is: play.twistedminds.net (Port: 25565)'
    },
    {
      regex: /when (was|is) (the )?(server|bot) created/i,
      response: 'The server was created in December 2025!'
    },
    // Add more pattern-based responses here
  ]
};

// Function to check local responses before API call
function checkLocalResponse(message) {
  const content = message.toLowerCase().trim();
  
  // Check exact matches
  if (LOCAL_RESPONSES[content]) {
    return LOCAL_RESPONSES[content];
  }
  
  // Check keyword matches
  for (const [keyword, response] of Object.entries(LOCAL_RESPONSES.keywords)) {
    if (content.includes(keyword.toLowerCase())) {
      return response;
    }
  }
  
  // Check pattern matches
  for (const pattern of LOCAL_RESPONSES.patterns) {
    if (pattern.regex.test(message)) {
      return pattern.response;
    }
  }
  
  return null; // No local match found, use API
}

// Event: Bot is ready
client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity('!help for commands', { type: 'WATCHING' });
});

// Event: Message received
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check for file attachments
  if (message.attachments.size > 0) {
    await handleFileUpload(message);
    return;
  }

  // Handle commands with prefix
  if (message.content.startsWith(CONFIG.prefix)) {
    await handleCommand(message);
    return;
  }

  // If in interactive chat mode, only respond to the user who initiated it
  const userChatKey = `${message.channel.id}:${message.author.id}`;
  if (interactiveModeChannels.has(userChatKey)) {
    await handleAIResponse(message, message.content, true);
    return;
  }

  // Handle mentions (bot responds when mentioned)
  if (message.mentions.has(client.user)) {
    await handleAIResponse(message);
  }
});

// Handle file uploads (PDF, Images)
async function handleFileUpload(message) {
  await message.channel.sendTyping();

  try {
    const attachment = message.attachments.first();
    const fileExtension = attachment.name.split('.').pop().toLowerCase();
    const fileUrl = attachment.url;

    // Download file
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    let extractedContent = '';
    let fileType = '';

    // Handle PDF files
    if (fileExtension === 'pdf') {
      fileType = 'PDF';
      const pdfData = await pdf(buffer);
      extractedContent = pdfData.text;

      if (!extractedContent || extractedContent.trim().length === 0) {
        await message.reply('❌ Could not extract text from this PDF. It might be image-based or encrypted.');
        return;
      }

      // Truncate if too long (Groq has token limits)
      if (extractedContent.length > 15000) {
        extractedContent = extractedContent.substring(0, 15000) + '\n\n[Content truncated due to length...]';
      }

      // Get AI summary
      const prompt = message.content || 'Please provide a comprehensive summary of this document, including key points, main topics, and important details.';
      await analyzePDF(message, extractedContent, prompt, attachment.name);
    }
    // Handle Image files
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
      fileType = 'Image';
      await analyzeImage(message, fileUrl, message.content || 'Describe this image in detail.');
    }
    else {
      await message.reply(`❌ Unsupported file type. I can only analyze:\n• **PDF files** (.pdf)\n• **Images** (.jpg, .jpeg, .png, .gif, .webp)`);
    }

  } catch (error) {
    console.error('File processing error:', error);
    await message.reply('❌ Sorry, I encountered an error while processing your file.');
  }
}

// Analyze PDF content
async function analyzePDF(message, content, userPrompt, fileName) {
  try {
    const completion = await groq.chat.completions.create({
      model: CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are a document analysis assistant. Provide clear, structured summaries and answer questions about documents.'
        },
        {
          role: 'user',
          content: `Document: ${fileName}\n\nContent:\n${content}\n\nUser request: ${userPrompt}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.5,
    });

    const analysis = completion.choices[0]?.message?.content || 'Could not generate analysis.';

    // Create embed response
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`📄 PDF Analysis: ${fileName}`)
      .setDescription(analysis.length > 4000 ? analysis.substring(0, 4000) + '...' : analysis)
      .addFields(
        { name: '📊 Document Stats', value: `• Characters: ${content.length}\n• Word count: ~${content.split(/\s+/).length}`, inline: true },
        { name: '💡 Tip', value: 'Ask follow-up questions about the document!', inline: true }
      )
      .setFooter({ text: 'Credit to ilyes⚡' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    // Store in conversation for follow-up questions
    const channelId = message.channel.id;
    if (!conversations.has(channelId)) {
      conversations.set(channelId, []);
    }
    const history = conversations.get(channelId);
    history.push({
      role: 'system',
      content: `Context: User uploaded a PDF (${fileName}). Content summary available for questions.`
    });

  } catch (error) {
    console.error('PDF analysis error:', error);
    await message.reply('❌ Sorry, I encountered an error while analyzing the PDF.');
  }
}

// Analyze images using vision model
async function analyzeImage(message, imageUrl, userPrompt) {
  try {
    const completion = await groq.chat.completions.create({
      model: CONFIG.visionModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.5,
    });

    const analysis = completion.choices[0]?.message?.content || 'Could not analyze image.';

    // Create embed response
    const embed = new EmbedBuilder()
      .setColor('#FF6B00')
      .setTitle('Image Analysis')
      .setDescription(analysis)
      .setImage(imageUrl)
      .setFooter({ text: 'Credit to ilyes⚡' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Image analysis error:', error);
    await message.reply('❌ Sorry, I encountered an error while analyzing the image. The vision model might be temporarily unavailable.');
  }
}

// Handle bot commands
async function handleCommand(message) {
  const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    switch (command) {
      case 'help':
        await sendHelpEmbed(message);
        break;

      case 'ask':
        if (args.length === 0) {
          await message.reply('Please provide a question! Example: `!ask What is JavaScript?`');
          return;
        }
        await handleAIResponse(message, args.join(' '));
        break;

      case 'clear':
        conversations.delete(message.channel.id);
        const clearKey = `${message.channel.id}:${message.author.id}`;
        if (interactiveModeChannels.has(clearKey)) {
          interactiveModeChannels.delete(clearKey);
          await message.reply('✅ Conversation history cleared and exited interactive mode!');
        } else {
          await message.reply('✅ Conversation history cleared!');
        }
        break;

      case 'chat':
        // Enter interactive chat mode (user-specific)
        const userKey = `${message.channel.id}:${message.author.id}`;
        interactiveModeChannels.add(userKey);
        const startMessage = args.length > 0 ? args.join(' ') : null;
        
        await message.reply('**Interactive chat mode activated!**\nOnly you can chat with me in this mode.\nJust type your messages naturally. I\'ll remember our conversation.\nType `!exit` to leave chat mode.');
        
        if (startMessage) {
          await handleAIResponse(message, startMessage, true);
        }
        break;

      case 'exit':
        const exitKey = `${message.channel.id}:${message.author.id}`;
        if (interactiveModeChannels.has(exitKey)) {
          interactiveModeChannels.delete(exitKey);
          await message.reply('👋 **Exited interactive chat mode.**\nUse `!chat` to start again!');
        } else {
          await message.reply('You\'re not in interactive chat mode. Use `!chat` to start!');
        }
        break;

      case 'ping':
        const ping = Date.now() - message.createdTimestamp;
        await message.reply(`🏓 Pong! Latency: ${ping}ms`);
        break;

      default:
        await message.reply(`Unknown command! Use \`${CONFIG.prefix}help\` to see available commands.`);
    }
  } catch (error) {
    console.error('Command error:', error);
    await message.reply('❌ An error occurred while processing your command.');
  }
}

// Handle AI responses using Groq
async function handleAIResponse(message, customPrompt = null, keepHistory = false) {
  const prompt = customPrompt || message.content.replace(`<@${client.user.id}>`, '').trim();
  
  if (!prompt) {
    await message.reply('Please provide a message for me to respond to!');
    return;
  }

  // CHECK LOCAL RESPONSES FIRST (saves API calls & gives instant answers!)
  const localResponse = checkLocalResponse(prompt);
  if (localResponse) {
    await message.reply(localResponse);
    return;
  }

  // Show typing indicator
  await message.channel.sendTyping();

  try {
    // Get or create conversation history (SHARED by channel across all users)
    const channelId = message.channel.id;
    if (!conversations.has(channelId)) {
      conversations.set(channelId, []);
    }
    const history = conversations.get(channelId);

    // Build messages array with username context
    const messages = [
      { role: 'system', content: `${CONFIG.systemPrompt}\n\nNote: This is a shared conversation in a Discord channel. Multiple users contribute. Current user: ${message.author.username}` },
      ...history,
      { role: 'user', content: `[${message.author.username}]: ${prompt}` }
    ];

    // Call Groq API (super fast & free!)
    const completion = await groq.chat.completions.create({
      model: CONFIG.model,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated.';

    // Update conversation history if chat mode (with user attribution)
    if (keepHistory) {
      history.push({ role: 'user', content: `[${message.author.username}]: ${prompt}` });
      history.push({ role: 'assistant', content: aiResponse });

      // Limit history length
      if (history.length > CONFIG.maxHistoryLength * 2) {
        history.splice(0, 2);
      }
    }

    // Send response (split if too long)
    if (aiResponse.length > 2000) {
      const chunks = aiResponse.match(/[\s\S]{1,1900}/g);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(aiResponse);
    }

  } catch (error) {
    console.error('Groq API error:', error);
    
    if (error.status === 429) {
      await message.reply('⏳ Rate limit reached. Please wait a moment and try again.');
    } else if (error.status === 401) {
      await message.reply('❌ Invalid API key. Please check your GROQ_API_KEY in .env file.');
    } else {
      await message.reply('❌ Sorry, I encountered an error while processing your request.');
    }
  }
}

// Send help embed
async function sendHelpEmbed(message) {
  const embed = new EmbedBuilder()
    .setColor('#F55036')
    .setTitle('Bot Commands')
    .setDescription('Here are all available commands:')
    .addFields(
      { name: `${CONFIG.prefix}ask [question]`, value: 'Ask a one-time question (no history)', inline: false },
      { name: `${CONFIG.prefix}chat [message]`, value: '**Enter interactive mode** - Just type naturally, I\'ll remember everything!', inline: false },
      { name: `${CONFIG.prefix}exit`, value: 'Exit interactive chat mode', inline: false },
      { name: `${CONFIG.prefix}clear`, value: 'Clear conversation history & exit chat mode', inline: false },
      { name: `${CONFIG.prefix}ping`, value: 'Check bot latency', inline: false },
      { name: `@mention`, value: 'Mention the bot to get a response', inline: false },
      { name: '📎 File Upload', value: '**Just upload a file!**\n• PDF: Get summary & analysis\n• Images: Get description & analysis\n• Add a message with the file for custom questions', inline: false }
    )
    .setFooter({ text: 'Full credit to ilyesmaya_123' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

// Login to Discord
const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ Missing DISCORD_TOKEN in environment. Add it to your .env file.');
  process.exit(1);
}
client.login(token);