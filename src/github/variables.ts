if (process.env.GITHUB_WEBHOOK_SECRET === undefined) {
  throw new Error("GITHUB_WEBHOOK_SECRET is not defined");
}

export const gitHubSecret = process.env.GITHUB_WEBHOOK_SECRET as string;
