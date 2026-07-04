# Deploy
<a href="https://pages.adityakp.dev/deploy/github?repo=https://github.com/Untoldhacker-Dev/simple-talk-with-admin-pages">
  <img src="https://hostpanel.adityakp.dev/deploy_button.jpg" alt="Deploy to adityakp.dev Pages" height="44">
</a>

## What it does
This project is a lightweight Telegram admin bot built for [adityakp.dev Pages](https://pages.adityakp.dev). It creates a bridge between Telegram users and an admin, enabling:

- Forwarding of user messages to a designated admin
- Admin replies that are automatically sent back to the original user
- Persistent storage of user-message mappings for reliable reply routing
- One-time webhook setup with automatic cleanup of configuration endpoint
- Configurable message history limits per user

This bot is designed to be minimal and efficient, perfect for support bots, feedback channels, or personal communication bridges without the complexity of a full database setup.

## How it works

1. The `/api` endpoint (one-time use) sets up the Telegram webhook pointing to your Pages deployment, send a get request to /api endpoint to setup bot webhook after setting up config.db_.json.
2. Once configured, Telegram sends all bot updates to the `/webhook` endpoint.
3. When a user messages the bot:
   - The message is forwarded to the admin using `forwardMessage`
   - A mapping between the user ID and forwarded message ID is stored
4. When the admin replies to a forwarded message:
   - The bot looks up the original user from the stored mapping
   - The reply is copied to the user using `copyMessage`
5. User-message mappings are stored in `bot.db_.json` with a configurable limit per user
6. Configuration is stored in `config.db_.json` for security (auto-protected by Pages due to db_.json extension)

> NOTE: db_.json files are automatically endpoint protected by adityakp.dev Pages, do not rename such files unless you want your secrets to get leaked.

## Main files

- `api.endpoint.js` - one-time webhook setup endpoint (self-deletes after configuration)
- `webhook.endpoint.js` - main bot logic handling all Telegram updates
- `config.db_.json` - bot configuration (token, admin ID, message limits)

## Configuration

Configure your bot by editing `config.db_.json`:

```json
{
  "bot_token": "YOUR_BOT_TOKEN_HERE",
  "admin_id": 123456789,
  "max_message_ids": 50,
  "isDone": false,
  "oneTimeCfgEndpoint": true
}
```

### Available settings

| Setting | Default | Description |
|---------|---------|-------------|
| `bot_token` | "YOUR_BOT_TOKEN_HERE" | Your Telegram bot token from @BotFather |
| `admin_id` | 123456789 | Telegram user ID of the admin who will receive forwarded messages |
| `max_message_ids` | 50 | Maximum number of message IDs to store per user (prevents storage bloat) |
| `isDone` | false | Webhook setup status (automatically set to true after successful setup) |
| `oneTimeCfgEndpoint` | true | If true, the `/api` endpoint self-deletes after successful webhook setup |

## Setup Instructions

1. **Create a Telegram bot** via [@BotFather](https://t.me/BotFather) and get your bot token
2. **Get your Telegram user ID** (you can use [@userinfobot](https://t.me/userinfobot))
3. **Deploy this template** using the deploy button above
4. **Edit `config.db_.json`** in the file manager:
   - Set your `bot_token`
   - Set your `admin_id`
   - Adjust `max_message_ids` if needed
5. **Run the setup** by visiting `https://<your subdomain>.pages.adityakp.dev/api`
6. **Test your bot** by sending a message to it on Telegram

## Restrictions
This code uses the `path` & `fs` npm packages which requires approval for custom installations. Unlike templates, custom installs require package approval from admin. To get a package (npm) usage approved for your site, contact admin@adityakp.dev.

--
> **Warning:** This particular code is compatible with adityakp.dev Pages (pages.adityakp.dev) only, click the button at the top of this document to deploy it directly on your domain using Pages.
