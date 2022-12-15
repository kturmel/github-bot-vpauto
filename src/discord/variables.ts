if (process.env.BOT_TOKEN === undefined) {
  throw new Error("BOT_TOKEN is not defined");
}

if (process.env.BOT_GUILD_ID === undefined) {
  throw new Error("BOT_GUILD_ID is not defined");
}

if (process.env.BOT_APP_ID === undefined) {
  throw new Error("BOT_APP_ID is not defined");
}

export const botToken = process.env.BOT_TOKEN as string;
export const botGuildId = process.env.BOT_GUILD_ID as string;
export const botAppId = process.env.BOT_APP_ID as string;
