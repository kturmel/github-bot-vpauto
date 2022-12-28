import { deployCommands, handle, login } from "./discord/discord.js";
import { startGitHubServer } from "./github/github.js";
import { E, log, error, pipe, TE } from "./fp-ts.js";

const res = await pipe(
  TE.fromIO(log("Starting bot...")),
  TE.chain(() => TE.fromIO(log("Login"))),
  TE.chain(() => login),
  TE.chain(() => TE.fromIO(log("Deploy Commands"))),
  TE.chain(() => deployCommands),
  TE.chain(() => TE.fromIO(log("Start GitHub Server"))),
  TE.chain(() => startGitHubServer),
  TE.chain(() => TE.fromIO(log("Ready!"))),
  TE.chain(() => TE.fromTask(handle))
)();

if (E.isLeft(res)) {
  error(res.left)();
  process.exit(1);
}
