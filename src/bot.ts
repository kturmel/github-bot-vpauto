import process from "node:process";
import fs from "node:fs";
import { config } from "dotenv";
import { deployCommands, handle, login } from "./discord/discord.js";
import { startGitHubServer } from "./github/github.js";
import { E, log, error, pipe, TE } from "./fp-ts.js";

if (
  (process.env.NODE_ENV === "production" && fs.existsSync(".env.production")) ||
  (process.env.NODE_ENV !== "production" && fs.existsSync(".env.local"))
) {
  config({
    path:
      process.env.NODE_ENV === "production" ? ".env.production" : ".env.local",
  });
}

if (fs.existsSync(".env")) {
  config({
    path: ".env",
  });
}

console.log({
  NODE_ENV: process.env.NODE_ENV,
  BOT_CONFIG_FILE: process.env.BOT_CONFIG_FILE,
});

/*
 * Start the discord bot
 * pre-start tasks are:
 * - login to discord
 * - deploy the Discord commands for the bot
 * - start the GitHub WebHook server
 */

const res = await pipe(
  TE.fromIO(log("starting bot...")),
  TE.chain(() => TE.fromIO(log("login"))),
  TE.chain(() => login),
  TE.chain(() => TE.fromIO(log("deploy Bot Commands"))),
  TE.chain(() => deployCommands),
  TE.chain(() => TE.fromIO(log("start GitHub server"))),
  TE.chain(() => startGitHubServer),
  TE.chain(() => TE.fromIO(log("the bot is ready!"))),
  TE.chain(() => TE.fromIO(handle))
)();

if (E.isLeft(res)) {
  error(res.left)();
  process.exit(1);
}
