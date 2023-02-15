import console from "node:console";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({
  path: ".env.local",
});

const res = spawnSync("docker", ["push", process.env.DOCKER_PROD_IMAGE], {
  stdio: "inherit",
});

if (res.status !== 0) {
  process.exit(1);
}

console.log(`Image ${process.env.DOCKER_PROD_IMAGE} pushed`);
