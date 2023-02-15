import console from "node:console";
import process from "node:process";
import { exec } from "node:child_process";
import { config } from "dotenv";

config({
  path: ".env.local",
});

const res = exec(
  `docker image tag vpauto-github/bot ${process.env.DOCKER_PROD_IMAGE}`
);

if (res.exitCode !== 0) {
  process.exit(res.exitCode);
}

console.log(
  `Image vpauto-github/bot tagged as ${process.env.DOCKER_PROD_IMAGE}`
);
