import * as rolldown from "rolldown";
import packageJson from "./package.json" with { type: "json" };
// @ts-expect-error
import { header } from "rollup-plugin-header";
// @ts-expect-error
import { minify as esbuildMinify } from "rollup-plugin-esbuild-minify";

const isWatch = process.argv.includes("--watch");
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
const options = {
  input: "src/umd.ts",
  platform: "browser",
  external: "",
  output: {
    format: "umd",
  },
  plugins: [
    esbuildMinify(),
    header({
      header: banner,
    }),
  ],
  treeshake: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isWatch ? "development" : "production",
    ),
  },
} satisfies rolldown.BuildOptions;

if (isWatch) {
  console.log("[umd] Watching for changes...");
  rolldown
    .watch({
      ...options,
    })
    .on("change", () => {
      console.log("[umd] Rebuilding...");
    });
} else {
  rolldown.build(options);
  console.log("[umd] Build completed");
}
