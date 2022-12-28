import Fastify from "fastify";
import { TextChannel } from "discord.js";
import { PullRequestEvent } from "@octokit/webhooks-types";
import { pullRequestEventToChannelMessage } from "./discord/pull-request-event-to-channel-message.js";
import { discordClient } from "../discord/discord.js";
import { discordConfig } from "../discord/config.js";
import { verifySignature } from "./verify-signature.js";
import { gitHubSecret } from "./variables.js";
import { E, log, O, pipe, TE } from "../fp-ts.js";

const server = Fastify({ logger: true });

server.post("/github", async (req, reply) => {
  const bodyE = E.fromNullable(new Error("no body provided"))(
    req.body as PullRequestEvent | { zen: string }
  );

  if (E.isLeft(bodyE)) {
    log(bodyE.left)();

    reply.status(400);

    return { ok: false };
  }

  const body = bodyE.right;

  const isSignatureValid = pipe(
    req.headers["x-hub-signature-256"] as string | undefined,
    O.fromNullable,
    O.map((signature) =>
      verifySignature(gitHubSecret, JSON.stringify(body), signature)
    ),
    O.getOrElse(() => false)
  );

  if (!isSignatureValid) {
    reply.status(401);
    return { ok: false };
  }

  if ("zen" in body) {
    return { ok: true };
  }

  if (!discordConfig.channelId) {
    return { ok: false };
  }

  const { channelId } = discordConfig;

  const channelRes = await TE.tryCatch(
    () => discordClient.channels.fetch(channelId) as Promise<TextChannel>,
    (err) => new Error(`cannot fetch channel. Error given: ${err}`)
  )();

  if (E.isLeft(channelRes)) {
    log(channelRes.left)();

    return { ok: false };
  }

  const channel = channelRes.right;

  const pullRequestMessage = pullRequestEventToChannelMessage(body);

  if (O.isNone(pullRequestMessage)) {
    log("pull request type not supported")();

    return { ok: false };
  }

  const sendingMessage = await TE.tryCatch(
    () => channel.send(pullRequestMessage.value),
    (err) =>
      new Error(
        `cannot send pull request message to channel. Error given: ${err}`
      )
  )();

  if (E.isLeft(sendingMessage)) {
    log(sendingMessage.left)();

    return { ok: false };
  }

  return { ok: true };
});

export const startGitHubServer = pipe(
  TE.tryCatch(
    () => server.listen({ port: 8456, host: "0.0.0.0" }),
    (e) => new Error(`cannot start github server. Error given: ${e}`)
  ),
  TE.map(() => server)
);
