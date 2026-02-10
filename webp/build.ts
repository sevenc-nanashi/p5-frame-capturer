import fs from "node:fs/promises";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import { build } from "tsdown";
import * as zx from "zx";

const { $ } = zx;

await fs.rm("./pkg", { recursive: true, force: true });

$.verbose = true;
zx.cd(import.meta.dirname);
await $`wasm-pack build --target web --out-dir pkg`;

await build({
  entry: {
    webpEncoder: "./pkg/webp.js",
  },
  format: "esm",
  outDir: "../src",
  minify: true,
  platform: "browser",
  treeshake: true,
  clean: false,
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
