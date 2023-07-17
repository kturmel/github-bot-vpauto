import { env } from "../lib/env.js";

export const token = () => env("BOT_TOKEN");
export const guildId = () => env("BOT_GUILD_ID");
export const appId = () => env("BOT_APP_ID");
export const configFile = () =>
  env("BOT_CONFIG_FILE", "config/discord-bot.config.json");
