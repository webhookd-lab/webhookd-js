import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/fetch.ts", "src/express.ts", "src/hono.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
