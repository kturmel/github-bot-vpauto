import Fastify from "fastify";
import { TextChannel } from "discord.js";
import { PullRequestEvent } from "@octokit/webhooks-types";
import { pullRequestEventToChannelMessage } from "./discord/pull-request-event-to-channel-message.js";
import { discordClient } from "../discord/discord.js";
import { discordConfig } from "../discord/config.js";

const server = Fastify({ logger: true });

server.post("/github", async (req, reply) => {
  const body = req.body as PullRequestEvent;

  console.log(body);

  console.log("discord config", discordConfig);

  if (discordConfig.channelId) {
    const channel = (await discordClient.channels.fetch(
      discordConfig.channelId
    )) as TextChannel;

    console.log("che", channel);

    const pullRequestMessage = pullRequestEventToChannelMessage(body);

    if (pullRequestMessage) {
      await channel.send(pullRequestMessage);
    }
  }

  return { hello: "world2" };
});

export async function startGitHubServer() {
  try {
    await server.listen({ port: 4567 });

    return server;
  } catch (err) {
    server.log.error(err);
    console.error(err);
    process.exit(1);
  }
}
