// webhook.endpoint.js → /webhook
// Main bot logic - receives all Telegram updates
// This file is executed when Telegram sends updates to the webhook URL
// WARNING: THIS FILE USES "PATH" and "fs" NPM PACKAGE, WHICH IS NOT A GLOBALLY APPROVED PACKAGE, MAKE SURE TO GET ADMIN APPROVAL FOR "PATH" BEFORE HOSTING IT

const axios = require("axios");

// Initialize database
const db = new Disk("bot");

// Load config
const config = JSON.parse(require("fs").readFileSync(
  require("path").join(__siteDir, "config.db_.json"), 
  "utf8"
));

const BOT_TOKEN = config.bot_token;
const ADMIN_ID = config.admin_id;
const MAX_MESSAGE_IDS = config.max_message_ids || 50;

// Telegram API helper
async function telegramAPI(method, params) {
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
      params
    );
    return response.data;
  } catch (error) {
    console.error("Telegram API Error:", error.message, { method, params });
    return null;
  }
}

function getUserData(userId) {
  const key = `user_${userId}`;
  return db.get(key) || { messageIds: [] };
}

// Save user data
function saveUserData(userId, data) {
  const key = `user_${userId}`;
  db.set(key, data);
}

// Store message mapping
function storeMessageMapping(userId, forwardedMsgId) {
  const userData = getUserData(userId);
  
  // Add new message ID
  userData.messageIds.push(forwardedMsgId);
  
  // Keep only last X messages
  if (userData.messageIds.length > MAX_MESSAGE_IDS) {
    userData.messageIds = userData.messageIds.slice(-MAX_MESSAGE_IDS);
  }
  
  saveUserData(userId, userData);
  
  // Store reverse mapping for quick lookup
  db.set(`msg_${forwardedMsgId}`, userId);
}

// Find user by forwarded message ID
function findUserByMessageId(messageId) {
  return db.get(`msg_${messageId}`);
}

async function handleStartCommand(msg) {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "User";
  
  const welcomeMessage = `👋 Hello ${firstName}!\n\n` +
    `Welcome to the Support Bot. Your messages will be forwarded to our admin, ` +
    `and you'll receive replies right here.\n\n` +
    `Simply send your message and I'll get back to you as soon as possible!`;
  
  await telegramAPI("sendMessage", {
    chat_id: chatId,
    text: welcomeMessage
  });
  
  console.log(`Start command used by user ${msg.from.id} (${firstName})`);
}

// Handle messages from users
async function handleUserMessage(msg) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  
  // Forward message to admin
  const result = await telegramAPI("forwardMessage", {
    chat_id: ADMIN_ID,
    from_chat_id: chatId,
    message_id: msg.message_id
  });
  
  if (result && result.ok) {
    // Store mapping between user and forwarded message
    storeMessageMapping(userId, result.result.message_id);
    await telegramAPI("sendMessage", {
      chat_id: chatId,
      text: "✅ Your message has been forwarded to admin. You'll receive a reply soon.",
      reply_to_message_id: msg.message_id
    });
  }
}

// Handle admin replies
async function handleAdminReply(msg) {
  if (!msg.reply_to_message) return false;
  
  const repliedMsgId = msg.reply_to_message.message_id;
  const userId = findUserByMessageId(repliedMsgId);
  
  if (!userId) {
    console.error(`User not found for replied message ID: ${repliedMsgId}`);
    return false;
  }
  const result = await telegramAPI("copyMessage", {
    chat_id: userId,
    from_chat_id: ADMIN_ID,
    message_id: msg.message_id
  });
  
  if (result && result.ok) {
    await telegramAPI("sendMessage", {
      chat_id: ADMIN_ID,
      text: "✅ Reply sent to user",
      reply_to_message_id: msg.message_id
    });
  }
  
  return true;
}

// Main update handler
async function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || "";
    
    // Handle /start command from any user
    if (text.startsWith("/start")) {
      await handleStartCommand(msg);
      return;
    }
    
    // Ignore messages from admin to himself
    if (chatId === ADMIN_ID && !msg.reply_to_message) {
      return;
    }
    
    // Handle admin reply
    if (chatId === ADMIN_ID && msg.reply_to_message) {
      await handleAdminReply(msg);
      return;
    }
    
    // Handle user message
    if (chatId !== ADMIN_ID) {
      await handleUserMessage(msg);
    }
  }
}

// Process webhook
async function processWebhook() {
  const update = req.body;
  
  if (!update) {
    console.error("No update received in webhook");
    return res.status(400).json({ error: "No update received" });
  }
  
  try {
    await handleUpdate(update);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error processing update:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
}

// Only accept POST requests
if (req.method === "POST") {
  processWebhook();
} else {
  res.status(405).json({ error: "Method not allowed. Use POST request." });
}