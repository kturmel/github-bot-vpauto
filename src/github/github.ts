import Fastify from "fastify";
import { TextChannel } from "discord.js";
import { PullRequestEvent } from "@octokit/webhooks-types";
import { webhookEventToChannelMessage } from "./discord/webhook-event-to-channel-message.js";
import { discordClient } from "../discord/discord.js";
import { discordConfig } from "../discord/config.js";
import { verifySignature } from "./verify-signature.js";
import { gitHubSecret } from "./variables.js";
import { E, log, O, pipe, TE } from "../fp-ts.js";
import { getGithubUsers, GitHubUsers } from "../discord/github/users.js";

const server = Fastify({ logger: true });

let githubUsers: GitHubUsers;

/**
 * This is called by GitHub Servers when a pull request event occurs.
 *
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks
 */
server.post("/github", async (req, reply) => {
  const bodyOrError = E.fromNullable(new Error("no body provided"))(
    req.body as PullRequestEvent | { zen: string }
  );

  if (E.isLeft(bodyOrError)) {
    log(bodyOrError.left)();

    reply.status(400);

    return { ok: false };
  }

  const body = bodyOrError.right;

  // GitHub send the signature in a header. We need to verify it to be sure that
  // the request is coming from GitHub.
  const isSignatureValid = pipe(
    req.headers["x-hub-signature-256"] as string | undefined,
    O.fromNullable,
    O.map(verifySignature(gitHubSecret(), JSON.stringify(body))),
    O.getOrElse(() => false)
  );

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
    return { ok: false };
  }

  // get the discord configured channel
  const channelTaskOrError = await TE.tryCatch(
    () => discordClient.channels.fetch(channelId) as Promise<TextChannel>,
    (err) => new Error(`cannot fetch channel. Error given: ${err}`)
  )();

  if (E.isLeft(channelTaskOrError)) {
    log(channelTaskOrError.left)();

    return { ok: false };
  }

  const channel = channelTaskOrError.right;

  // construct a Discord message from the pull request event
  const pullRequestMessage = webhookEventToChannelMessage(githubUsers)(body);

  if (O.isNone(pullRequestMessage)) {
    log("webhook message is not supported")();

    return { ok: false };
  }

  const sendingMessageTaskOrError = await TE.tryCatch(
    () => channel.send(pullRequestMessage.value),
    (err) =>
      new Error(
        `cannot send pull request message to channel. Error given: ${err}`
      )
  )();

  if (E.isLeft(sendingMessageTaskOrError)) {
    log(sendingMessageTaskOrError.left)();

    return { ok: false };
  }

  return { ok: true };
});

export const startGitHubServer = pipe(
  TE.tryCatch(
    async () => {
      githubUsers = await getGithubUsers();

      return server.listen({ port: 8456, host: "0.0.0.0" });
    },
    (e) => new Error(`cannot start github server. Error given: ${e}`)
  ),
  TE.map(() => server)
);
