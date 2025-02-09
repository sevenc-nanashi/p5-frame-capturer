import { promises as fs } from "node:fs";
import * as rolldown from "rolldown";
import * as zx from "zx";

const { $ } = zx;

await fs.rm("./pkg", { recursive: true, force: true });

$.verbose = true;
zx.cd(import.meta.dirname);
await $`wasm-pack build --target web --out-dir pkg`;

await rolldown.build({
  input: "./pkg/webp.js",
  platform: "browser",
  output: {
    format: "esm",
    file: "../src/webpEncoder.js",
    minify: true,
  },
  treeshake: true,
});

await fs.copyFile("./pkg/webp.d.ts", "../src/webpEncoder.d.ts");

const wasm = await fs.readFile("./pkg/webp_bg.wasm");
await fs.writeFile(
  "../src/webpEncoder.wasm.js",
  `export default new Uint8Array(${JSON.stringify([...wasm])});`,
);
await fs.writeFile("../src/webpEncoder.wasm.d.ts", [
  "declare const wasm: Uint8Array;",
  "export default wasm;",
]);
