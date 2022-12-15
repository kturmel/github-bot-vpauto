import Fastify from "fastify";
import { TextChannel } from "discord.js";
import { PullRequestEvent } from "@octokit/webhooks-types";
import { pullRequestEventToChannelMessage } from "./discord/pull-request-event-to-channel-message.js";
import { discordClient } from "../discord/discord.js";
import { discordConfig } from "../discord/config.js";
import { verifySignature } from "./verify-signature.js";
import { gitHubSecret } from "./variables.js";

const server = Fastify({ logger: true });

server.post("/github", async (req, reply) => {
  const body = req.body as PullRequestEvent | { zen: string };
  const signature = req.headers["x-hub-signature-256"] as string | undefined;

  if (!signature) {
    reply.status(401);
    return { ok: false };
  }

  if (!verifySignature(gitHubSecret, JSON.stringify(body), signature)) {
    reply.status(401);
    return { ok: false };
  }

  if ("zen" in body) {
    return { ok: true };
  }

  if (!discordConfig.channelId) {
    return { ok: false };
  }

  const channel = (await discordClient.channels.fetch(
    discordConfig.channelId
  )) as TextChannel;

  const pullRequestMessage = pullRequestEventToChannelMessage(body);

  if (!pullRequestMessage) {
    return { ok: false };
  }

  await channel.send(pullRequestMessage);

  return { ok: true };
});

export async function startGitHubServer() {
  try {
    await server.listen({ port: 8456, host: "0.0.0.0" });

    return server;
  } catch (err) {
    server.log.error(err);
    console.error(err);
    process.exit(1);
  }
}
