import { WebhookClient } from "discord.js";
import Fastify from "fastify";
import fs from "node:fs";

const server = Fastify({ logger: true });

server.post("/github", async (req, reply) => {
  const body = req.body;

  console.log(body);
  fs.writeFileSync("test.json", JSON.stringify(body, null, 2));

  return { hello: "world2" };
});

try {
  await server.listen({ port: 4567 });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
