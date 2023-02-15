type GetEnv = {
  (name: string, defaults?: string): string;
  (name: string, defaults: string): string;
};

export const getEnv: GetEnv = (name: string, defaults?: string) => {
  if (!defaults && process.env[name] === undefined) {
    throw new Error(`${name} is not defined`);
  }

  return process.env[name] ?? (defaults as string);
};
