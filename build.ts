import * as rolldown from "rolldown";
import packageJson from "./package.json" with { type: "json" };

const isWatch = process.argv.includes("--watch");
const options = {
  input: "src/umd.ts",
  platform: "browser",
  external: "",
  output: {
    banner: [
      "/*",
      " * p5-frame-capturer",
      ` * ${packageJson.description}`,
      " *",
      " * @license MIT",
      ` * @version ${packageJson.version}`,
      ` * @repository ${packageJson.repository.url}`,
      " */",
    ].join("\n"),
    format: "umd",
  },
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
