import { getEnv } from "../lib/get-env.js";

export const gitHubSecret = () => getEnv("GITHUB_WEBHOOK_SECRET");
