import {
  initSync,
  encode as __do_not_use_this_directly_encode,
} from "./webpEncoder.js";

let encoderModulePromise: Promise<{
  encode: typeof __do_not_use_this_directly_encode;
}> | null = null;

const loadEncoderModule = async () => {
  const { default: wasm } = await import("./webpEncoder.wasm.js");
  initSync({ module: wasm.buffer });
  return {
    encode: __do_not_use_this_directly_encode,
  };
};

export const encodeWebPLossless = async (
  imageData: ImageData,
): Promise<Uint8Array> => {
  if (!encoderModulePromise) {
    encoderModulePromise = loadEncoderModule();
  }
  const encoder = await encoderModulePromise;
  const output = encoder.encode(
    new Uint8Array(imageData.data.buffer),
    imageData.width,
    imageData.height,
  );
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
