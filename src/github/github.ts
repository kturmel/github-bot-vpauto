import createFastify from "fastify";
import { TextChannel } from "discord.js";
import { PullRequestEvent } from "@octokit/webhooks-types";
import { webhookEventToChannelMessage } from "./discord/webhookEventToChannelMessage.js";
import { discordClient } from "../discord/discord.js";
import { discordConfig } from "../discord/config.js";
import { verifySignature } from "./verifySignature.js";
import { setDiscordUsersFromGitHubUsers } from "../discord/github/users.js";

const server = createFastify({ logger: true });

/**
 * Called by GitHub Servers when a pull request event occurs.
 *
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks
 */
server.post("/github", async (req, reply) => {
  const body = req.body as PullRequestEvent | { zen: string } | undefined;

  if (body === undefined) {
    console.log("no body found");

    reply.status(400);

    return { ok: false };
  }

  // GitHub send the signature in a header. We need to verify it to be sure that the request is coming from GitHub.
  const sentSignature = req.headers["x-hub-signature-256"] as
    | string
    | undefined;
  const isSignatureValid =
    sentSignature !== undefined
      ? verifySignature(JSON.stringify(body), sentSignature)
      : false;

  if (!isSignatureValid) {
    reply.status(401);

    return { ok: false };
  }

  // GitHub send a "zen" property when we need to ping the webhook.
  if ("zen" in body) {
    return { ok: true };
  }

  const { channelId } = discordConfig;

  // the bot is not yet configured to a channel
  if (!channelId) {
    console.log("no discord channel configured found");

    return { ok: false };
  }

  // get the discord configured channel
  let channel: TextChannel;

  try {
    channel = (await discordClient.channels.fetch(channelId)) as TextChannel;
  } catch (err) {
    console.log("cannot fetch channel", err);

    return { ok: false };
  }

  // construct a Discord message from the pull request event
  const pullRequestMessage = webhookEventToChannelMessage(body);

  if (pullRequestMessage === undefined) {
    console.log("webhook message is not supported");

    return { ok: false };
  }

  try {
    await channel.send(pullRequestMessage);
  } catch (err) {
    console.log("cannot send pull request message to channel", err);

    return { ok: false };
  }

  return { ok: true };
});

export class CannotFetchDiscordUsersError extends Error {}

export async function startServer() {
  try {
    await setDiscordUsersFromGitHubUsers();
  } catch (err) {
    throw new CannotFetchDiscordUsersError("cannot get github users", {
      cause: err,
    });
  }

  try {
    await server.listen({ port: 8456, host: "0.0.0.0" });

    return server;
  } catch (err) {
    console.log("cannot start github server", err);
  }
}
