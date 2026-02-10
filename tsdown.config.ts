import fs from "node:fs/promises";
import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

const commonBanner = [
  "/*",
  " * p5-frame-capturer",
  ` * ${packageJson.description}`,
  " *",
  " * @license MIT",
  ` * @version ${packageJson.version}`,
  ` * @repository ${packageJson.repository.url}`,
  " */",
];
const umdBanner = [
  ...commonBanner,
  "",
  "/*",
  " * vanjs-core License:",
  " * ```",
  ...(await fs.readFile("./node_modules/vanjs-core/LICENSE", "utf-8"))
    .split("\n")
    .map((line) => (line ? ` * ${line}` : " *")),
  " * ```",
  "*/",
  "",
].join("\n");
const esmBanner = [...commonBanner, ""].join("\n");

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
      codeSplitting: false,
    },
    banner: {
      js: umdBanner,
    },
    minify: true,
    platform: "browser",
    treeshake: true,
    noExternal: ["vanjs-core"],
    skipNodeModulesBundle: false,
    define: {
      "import.meta": "{}",
    },
  },
]);
