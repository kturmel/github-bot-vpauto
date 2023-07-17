import { env } from "../lib/env.js";

export const gitHubSecret = () => env("GITHUB_WEBHOOK_SECRET");
