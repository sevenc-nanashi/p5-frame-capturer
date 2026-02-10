import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

const banner = [
  "/*",
  " * p5-frame-capturer",
  ` * ${packageJson.description}`,
  " *",
  " * @license MIT",
  ` * @version ${packageJson.version}`,
  ` * @repository ${packageJson.repository.url}`,
  " */",
  "",
].join("\n");

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: "esm",
    outDir: "dist",
    dts: true,
    minify: isProduction,
    platform: "browser",
    treeshake: true,
    skipNodeModulesBundle: true,
  },
  {
    entry: {
      umd: "src/umd.ts",
    },
    format: "umd",
    outputOptions: {
      file: "./dist/umd.js",
    },
    banner: {
      js: banner,
    },
    minify: true,
    platform: "browser",
    treeshake: true,
    skipNodeModulesBundle: false,
  },
]);
