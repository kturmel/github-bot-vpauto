if (process.env.GITHUB_WEBHOOK_SECRET === undefined) {
  throw new Error("GITHUB_WEBHOOK_SECRET is not defined");
}

const secret = process.env.GITHUB_WEBHOOK_SECRET as string;
