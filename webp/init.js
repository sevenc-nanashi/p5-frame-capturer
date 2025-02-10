const base64Data = "/*__WASM__*/";
const buffer = atob(base64Data)
  .split("")
  .map((c) => c.charCodeAt(0));
let dataPromise;

const getDataImpl = async () => {
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(new Uint8Array(buffer));
  writer.close();
  const result = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(result);
};

const getWasm = () => {
  if (!dataPromise) {
    dataPromise = getDataImpl();
  }
  return dataPromise;
};

export default getWasm;
