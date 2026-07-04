// api.endpoint.js → /api
// Run this once to set up the webhook

const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function setupWebhook() {
  try {
    const configPath = path.join(__siteDir, "config.db_.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    if (config.isDone) {
      return res.status(400).json({ 
        success: false, 
        message: "Webhook already configured. Set isDone to false in config.db_.json to reconfigure." 
      });
    }

    if (!config.bot_token || config.bot_token === "YOUR_BOT_TOKEN_HERE") {
      return res.status(400).json({ 
        success: false, 
        message: "Please set your bot token in config.db_.json first" 
      });
    }

    // Get the webhook URL (this site's webhook endpoint)
    const webhookUrl = `https://${req.headers.host}/webhook`;
    
    // Set webhook
    const response = await axios.post(
      `https://api.telegram.org/bot${config.bot_token}/setWebhook`,
      { url: webhookUrl }
    );

    if (response.data.ok) {
      config.isDone = true;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      // Check if one-time config endpoint deletion is enabled
      let deleted = false;
      if (config.oneTimeCfgEndpoint === true) {
        const apiEndpointPath = path.join(__siteDir, "api.endpoint.js");
        
        try {
          if (fs.existsSync(apiEndpointPath)) {
            fs.unlinkSync(apiEndpointPath);
            deleted = true;
            console.log("api.endpoint.js deleted successfully after webhook setup");
          }
        } catch (deleteError) {
          console.error("Failed to delete api.endpoint.js:", deleteError.message);
        }
      }
      
      return res.status(200).json({ 
        success: true, 
        message: "Webhook configured successfully" + (deleted ? " - Config endpoint deleted" : ""),
        webhook_url: webhookUrl,
        telegram_response: response.data,
        config_endpoint_deleted: deleted
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Failed to set webhook",
        telegram_response: response.data
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Error setting up webhook",
      error: error.message 
    });
  }
}

// Only allow GET requests for setup
if (req.method === "GET") {
  setupWebhook();
} else {
  res.status(405).json({ error: "Method not allowed. Use GET request." });
}