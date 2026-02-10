import type * as CSS from "csstype";
import type p5 from "p5";
import van from "vanjs-core";
import { encodeWebPLossless } from "./webp.ts";

const { div, a, button, select, option, input } = van.tags;

const logPrefix = "[p5-frame-capturer]";

const attachedSymbol = Symbol("p5-frame-capturer-installed");

const styleObjectToStylesheet = (styleObjects: CSS.Properties) => {
  return Object.entries(styleObjects)
    .map(([key, value]) => {
      return `${key.replace(
        /[A-Z]/g,
        (m) => `-${m.toLowerCase()}`,
      )}: ${value};`;
    })
    .join("\n");
};

/** Supported image formats */
export const supportedImageFormats = [
  "png",
  "jpg",
  "webp",
  "webpLossless",
] as const;

/** Supported image formats */
export type SupportedImageFormat = (typeof supportedImageFormats)[number];

/** Options for the capturer */
export type Options = {
  /** Image format */
  format: (typeof supportedImageFormats)[number];
  /** Number of frames to capture. Set to undefined or 0 to capture until stopped */
  frames: number | undefined;
  /** Parallel write limit. Default: 8, set to 0 to disable limit */
  parallelWriteLimit: number;
  /** A callback that is called after all frames are captured. Will not be called if frames is undefined */
  onFinished?: () => void;
};

const defaultOptions: Options = {
  format: "png",
  frames: undefined,
  parallelWriteLimit: 8,
  onFinished: undefined,
};

const formatInfos = {
  png: {
    label: "PNG",
    mimeType: "image/png",
    extension: "png",
  },
  jpg: {
    label: "JPEG",
    mimeType: "image/jpeg",
    extension: "jpg",
  },
  webp: {
    label: "WebP",
    mimeType: "image/webp",
    extension: "webp",
  },
  webpLossless: {
    label: "WebP (lossless)",
    extension: "webp",
  },
};

/** State of the capturer */
export const state = {
  /** Whether the capturer is capturing */
  get isCapturing() {
    return internalState.isCapturing.val;
  },
  /** Number of frames captured */
  get frameCount() {
    return internalState.frameCount.val;
  },
  /** Number of frames to capture */
  get frames() {
    return internalState.frames.val;
  },
  /** Frames captured per second */
  get fps() {
    return internalState.fps.val;
  },
};

const fpsSamples = 10;
const internalState = {
  isCapturing: van.state(false),
  frameCount: van.state(0),
  frames: van.state<number>(0),

  parallelWriteLimit: van.state(defaultOptions.parallelWriteLimit),

  directoryHandle: undefined as FileSystemDirectoryHandle | undefined,
  format: van.state<SupportedImageFormat>(defaultOptions.format),
  p: undefined as p5 | undefined,
  wasLooping: false,

  numCurrentWrites: 0,

  fps: van.state(0),
  fpsInfo: {
    lastFrameCount: 0,
    lastTime: Date.now(),
  },
  fpsBuffer: {
    currentIndex: 0,
    buffer: [] as number[],
  },

  onFinished: defaultOptions.onFinished,

  isDragging: van.state(false),
  positionX: van.state(8),
  positionY: van.state(8),
  xOffset: van.state(0),
  yOffset: van.state(0),
};

async function postDraw() {
  if (!internalState.p) {
    return;
  }
  // @ts-expect-error undocumented
  const canvas: HTMLCanvasElement = internalState.p.canvas;
  const ctx = internalState.p.drawingContext;
  const frameCount = state.frameCount;
  let blob: Uint8Array | undefined;
  switch (internalState.format.val) {
    case "webpLossless": {
      if (ctx instanceof CanvasRenderingContext2D) {
        blob = await encodeWebPLossless(
          canvas.width,
          canvas.height,
          new Uint8Array(
            ctx.getImageData(0, 0, canvas.width, canvas.height).data,
          ),
        );
      } else {
        const imageData = new Uint8Array(canvas.width * canvas.height * 4);
        ctx.readPixels(
          0,
          0,
          canvas.width,
          canvas.height,
          ctx.RGBA,
          ctx.UNSIGNED_BYTE,
          imageData,
        );
        blob = await encodeWebPLossless(canvas.width, canvas.height, imageData);
      }
      break;
    }
    default: {
      const mimeType = formatInfos[internalState.format.val].mimeType;
      blob = await new Promise<Blob | undefined>((resolve) =>
        canvas.toBlob((blob) => {
          resolve(blob ?? undefined);
        }, mimeType),
      )
        .then((blob) => blob?.arrayBuffer())
        .then((buffer) => buffer && new Uint8Array(buffer));
    }
  }
  if (!blob) {
    return;
  }
  if (!state.isCapturing) {
    return;
  }
  if (
    internalState.parallelWriteLimit.val > 0 &&
    internalState.numCurrentWrites >= internalState.parallelWriteLimit.val
  ) {
    while (
      internalState.numCurrentWrites >= internalState.parallelWriteLimit.val
    ) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  if (!internalState.directoryHandle) {
    return;
  }
  const fileName = `frame-${frameCount.toString().padStart(5, "0")}.${formatInfos[internalState.format.val].extension}`;
  const fileHandle = await internalState.directoryHandle.getFileHandle(
    fileName,
    {
      create: true,
    },
  );
  const writable = await fileHandle.createWritable();
  internalState.numCurrentWrites++;
  void writable
    .write(blob as Uint8Array<ArrayBuffer>)
    .then(() => writable.close())
    .then(() => {
      console.log(`${logPrefix} Frame ${frameCount} saved as ${fileName}`);
      internalState.numCurrentWrites--;
    });
  internalState.frameCount.val++;
  if (internalState.fpsInfo.lastTime + 1000 < Date.now()) {
    const newFps =
      (internalState.frameCount.val - internalState.fpsInfo.lastFrameCount) /
      ((Date.now() - internalState.fpsInfo.lastTime) / 1000);
    internalState.fpsBuffer.buffer[internalState.fpsBuffer.currentIndex] =
      newFps;
    internalState.fpsBuffer.currentIndex++;
    if (internalState.fpsBuffer.currentIndex >= fpsSamples) {
      internalState.fpsBuffer.currentIndex = 0;
    }

    internalState.fps.val =
      internalState.fpsBuffer.buffer.reduce((acc, val) => acc + val, 0) /
      internalState.fpsBuffer.buffer.length;
    internalState.fpsInfo.lastTime = Date.now();
    internalState.fpsInfo.lastFrameCount = internalState.frameCount.val;
  }

  if (state.frames && state.frameCount >= state.frames) {
    console.log(`${logPrefix} Finished capturing`);
    internalState.onFinished?.();
    await stopCapturer();
  } else {
    internalState.p?.redraw();
  }
}

const onMouseMove = (e: MouseEvent) => {
  const p = internalState.p;
  if (!p) {
    return;
  }
  if (!internalState.isDragging.val) {
    return;
  }

  e.preventDefault();
  const newX = e.clientX - internalState.xOffset.val;
  const newY = e.clientY - internalState.yOffset.val;
  internalState.positionX.val = newX;
  internalState.positionY.val = newY;
};

const onMoveEnd = () => {
  internalState.isDragging.val = false;
  document.removeEventListener("mouseup", onMoveEnd);
};

/** Attach the capturer UI to the p5 instance */
export async function attachCapturerUi(p: p5) {
  if (!p) {
    throw new Error("p5 instance is required");
  }
  // @ts-expect-error My own property
  if (!p[attachedSymbol]) {
    throw new Error(
      "p5 instance is not patched. Did you forget to register the p5FrameCapturer addon?",
    );
  }
  if (internalState.p) {
    throw new Error("UI already attached!");
  }

  const isStartButtonHovered = van.state(false);
  const isMainUiHovered = van.state(false);
  const ui = div(
    {
      style: () =>
        styleObjectToStylesheet({
          position: "fixed",
          border: "1px solid #ccc",
          color: "#fff",
          padding: "8px",
          borderRadius: "8px",
          backgroundColor: isMainUiHovered.val ? "#222" : "#2228",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          zIndex: "1000",
          fontFamily: "sans-serif",
          left: `${internalState.positionX.val}px`,
          top: `${internalState.positionY.val}px`,
        }),
      onmouseenter: () => {
        isMainUiHovered.val = true;
      },
      onmouseleave: () => {
        isMainUiHovered.val = false;
      },
    },
    div(
      {
        style: () =>
          styleObjectToStylesheet({
            fontSize: "1.2em",
            fontWeight: "bold",
            cursor: internalState.isDragging.val ? "grabbing" : "grab",
          }),
        onmousedown: (e: MouseEvent) => {
          e.preventDefault();
          internalState.xOffset.val = e.offsetX;
          internalState.yOffset.val = e.offsetY;
          internalState.isDragging.val = true;
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMoveEnd);
        },
      },
      "p5-frame-capturer",
    ),

    "showDirectoryPicker" in window
      ? [
          div("Status: ", () => (state.isCapturing ? "Capturing" : "Ready")),
          div("Frames: ", () => {
            if (!state.isCapturing) {
              return input({
                type: "number",
                min: "0",
                value: () =>
                  internalState.frames.val === undefined
                    ? ""
                    : internalState.frames.val.toString(),
                disabled: () => state.isCapturing,
                onchange: (e: Event) => {
                  const target = e.target as HTMLInputElement;
                  internalState.frames.val = Number.parseInt(target.value, 10);
                },
              });
            }
            if (!state.frames) {
              return `${state.frameCount} (${state.fps ? state.fps.toFixed(2) : "-"} frames/s)`;
            }
            return `${state.frameCount}/${state.frames} (
              ${state.fps ? state.fps.toFixed(2) : "-"} frames/s, ETA: ${
                state.fps
                  ? formatSeconds((state.frames - state.frameCount) / state.fps)
                  : "-"
              })`;
          }),
          div(
            {
              style: () =>
                styleObjectToStylesheet({
                  display: "flex",
                  gap: "4px",
                }),
            },
            "Format: ",
            select(
              {
                disabled: () => state.isCapturing,
                onchange: (e: Event) => {
                  const target = e.target as HTMLSelectElement;
                  internalState.format.val = target.value as Options["format"];
                },
              },
              supportedImageFormats.map((format) =>
                option(
                  {
                    value: format,
                    selected: internalState.format.val === format,
                  },
                  formatInfos[format].label,
                ),
              ),
            ),
          ),
          div(
            {
              style: () =>
                styleObjectToStylesheet({
                  display: "flex",
                  gap: "4px",
                }),
            },
            "Parallel write limit: ",
            input({
              type: "number",
              min: "0",
              value: () => internalState.parallelWriteLimit.val.toString(),
              disabled: () => state.isCapturing,
              onchange: (e: Event) => {
                const target = e.target as HTMLInputElement;
                internalState.parallelWriteLimit.val = Number.parseInt(
                  target.value,
                  10,
                );
              },
            }),
          ),

          button(
            {
              style: () =>
                styleObjectToStylesheet({
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  backgroundColor: isStartButtonHovered.val ? "#eee" : "#fff",
                  color: "#000",
                  cursor: "pointer",
                }),
              onmouseenter: () => {
                isStartButtonHovered.val = true;
              },
              onmouseleave: () => {
                isStartButtonHovered.val = false;
              },
              onclick: async () => {
                if (state.isCapturing) {
                  await stopCapturer();
                } else {
                  await startCapturer(p, {
                    format: internalState.format.val,
                    frames: internalState.frames.val,
                    parallelWriteLimit: internalState.parallelWriteLimit.val,
                  });
                }
              },
            },
            () => (state.isCapturing ? "Stop" : "Start"),
          ),
        ]
      : [
          div("Error: Unsupported browser"),
          a(
            {
              href: "https://developer.mozilla.org/en-US/docs/Web/API/File_System_API#browser_compatibility",
              style: styleObjectToStylesheet({
                color: "#88f",
              }),
              target: "_blank",
            },
            "List of supported browsers",
          ),
        ],
  );
  van.add(document.body, ui);
  internalState.p = p;
}

/** Start capturing frames */
export async function startCapturer(p: p5, options: Partial<Options> = {}) {
  if (!(attachedSymbol in p)) {
    throw new Error(
      "p5 instance is not patched. Did you forget to register the p5FrameCapturer addon?",
    );
  }

  const realOptions = {
    ...defaultOptions,
    ...options,
  } satisfies Options;
  if (!supportedImageFormats.includes(realOptions.format)) {
    throw new Error(`Unsupported format: ${realOptions.format}`);
  }
  const handle = await window.showDirectoryPicker({
    mode: "readwrite",
  });
  if (!handle) {
    throw new Error("No directory handle");
  }

  internalState.isCapturing.val = true;
  internalState.frameCount.val = 0;
  internalState.p = p;
  internalState.directoryHandle = handle;
  internalState.fps.val = 0;
  internalState.fpsInfo = {
    lastFrameCount: 0,
    lastTime: Date.now(),
  };

  internalState.format.val = realOptions.format;
  internalState.frames.val = realOptions.frames ?? 0;
  internalState.parallelWriteLimit.val = realOptions.parallelWriteLimit;
  internalState.onFinished = realOptions.onFinished;

  console.log(`${logPrefix} Started capturing`);
  console.log(
    `${logPrefix} format=%o, frames=%o, parallelWriteLimit=%o`,
    realOptions.format,
    realOptions.frames,
    realOptions.parallelWriteLimit,
  );

  internalState.wasLooping = p.isLooping();
  p.noLoop();
  p.redraw();
}

/** Stop capturing frames */
export async function stopCapturer() {
  if (!internalState.isCapturing.val) {
    return;
  }
  internalState.isCapturing.val = false;
  internalState.directoryHandle = undefined;
  if (internalState.wasLooping) {
    internalState.p?.loop();
  }
}

const formatSeconds = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(2)}s`;
};
type Lifecycles = Record<
  "presetup" | "postsetup" | "predraw" | "postdraw" | "remove",
  (this: p5) => void | Promise<void>
>;

/** Options for the p5 addon */
export type AddonOptions = {
  /** Whether to automatically attach the UI. Default: true */
  ui?: boolean;
};
/**
 * Install p5-frame-capturer into the p5 instance lifecycles.
 * Use p5.registerAddon to register this function.
 *
 * @example
 * ```typescript
 * import p5 from "p5";
 * import { p5FrameCapturer } from "p5-frame-capturer";
 *
 * p5.registerAddon(p5FrameCapturer());
 * ```
 */
export function p5FrameCapturer(
  options?: AddonOptions,
  __detect_wrong_usage__?: never,
): (p5: p5, fn: typeof p5, lifecycles: Lifecycles) => void {
  if (__detect_wrong_usage__ !== undefined) {
    throw new Error(
      "Detected wrong usage! Please use `p5.registerAddon(p5FrameCapturer())` (note the extra parentheses) instead.",
    );
  }
  const realOptions: AddonOptions = {
    ui: true,
    ...options,
  };
  return (p5: p5, fn: typeof p5, lifecycles: Lifecycles) => {
    // @ts-expect-error My own property
    fn[attachedSymbol] = true;
    if (realOptions.ui) {
      lifecycles.postsetup = async function () {
        await attachCapturerUi(this);
      };
    }
    lifecycles.postdraw = async function () {
      await postDraw();
    };
    lifecycles.remove = async function () {
      await stopCapturer();
    };
  };
}
