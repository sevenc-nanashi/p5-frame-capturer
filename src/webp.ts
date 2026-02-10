import {
  encode as __do_not_use_this_directly_encode,
  initSync,
} from "./webpEncoder.js";

let encoderModulePromise: Promise<{
  encode: typeof __do_not_use_this_directly_encode;
}> | null = null;

const loadEncoderModule = async () => {
  const { default: getWasm } = await import("./webpEncoder.wasm.js");
  const wasm = await getWasm();
  initSync({ module: wasm.buffer });
  return {
    encode: __do_not_use_this_directly_encode,
  };
};

export const encodeWebPLossless = async (
  width: number,
  height: number,
  imageData: Uint8Array,
): Promise<Uint8Array> => {
  if (!encoderModulePromise) {
    encoderModulePromise = loadEncoderModule();
  }
  const encoder = await encoderModulePromise;
  const output = encoder.encode(imageData, width, height);
  if (process.env.NODE_ENV === "development") {
    const header = output.slice(0, 4);
    if (
      !(
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46
      )
    ) {
      throw new Error(`Invalid WebP header: ${header}, expected "RIFF"`);
    }
  }

  return output;
};
