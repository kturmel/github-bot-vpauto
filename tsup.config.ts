import { defineConfig } from "tsup";

export default defineConfig((options) => {
  return {
    entry: ["src/**/*.ts"],
    sourcemap: true,
    format: ["esm"],
    bundle: false,
    clean: true,
    outDir: "dist",
  };
});
