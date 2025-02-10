import fs from "node:fs/promises";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
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
const gzipped = await promisify(gzip)(wasm);
const init = await fs.readFile("./init.js", "utf-8");
await fs.writeFile(
  "../src/webpEncoder.wasm.js",
  init.replace("/*__WASM__*/", gzipped.toString("base64")),
);
await fs.writeFile("../src/webpEncoder.wasm.d.ts", [
  "declare const getWasm: () => Promise<Uint8Array>;",
  "export default getWasm;",
]);
