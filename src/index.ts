import type * as CSS from "csstype";
import type p5 from "p5";
import van from "vanjs-core";

const { div, button } = van.tags;

const logPrefix = "[p5-frame-capturer]";

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
export const supportedImageFormats = ["png", "jpeg", "webp"] as const;

/** Options for the capturer */
export type Options = {
  /** Image format */
  format: (typeof supportedImageFormats)[number];
  /** Number of frames to capture, or undefined to capture until stopped */
  frames: number | undefined;
};

const formatToMimeType: Record<Options["format"], string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
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
};

const internalState = {
  isCapturing: van.state(false),
  frameCount: van.state(0),
  frames: van.state<number | undefined>(undefined),

  directoryHandle: undefined as FileSystemDirectoryHandle | undefined,
  format: van.state<"png" | "jpeg" | "webp">("png"),
  p: undefined as p5 | undefined,
  wasLooping: false,

  isDragging: van.state(false),
  positionX: van.state(8),
  positionY: van.state(8),
  xOffset: van.state(0),
  yOffset: van.state(0),
};

async function postDraw() {
  // @ts-expect-error undocumented
  const canvas: HTMLCanvasElement = internalState.p.canvas;
  const frameCount = state.frameCount;
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, formatToMimeType[internalState.format.val]);
  });
  if (!blob) {
    return;
  }
  if (!state.isCapturing) {
    return;
  }
  if (!internalState.directoryHandle) {
    return;
  }
  const fileName = `frame-${frameCount.toString().padStart(5, "0")}.${internalState.format.val}`;
  const fileHandle = await internalState.directoryHandle.getFileHandle(
    fileName,
    {
      create: true,
    },
  );
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  writable.close();
  console.log(`${logPrefix} Wrote frame ${frameCount}`);
  internalState.frameCount.val++;

  if (state.frames !== undefined && state.frameCount >= state.frames) {
    console.log(`${logPrefix} Finished capturing`);
    await stopCapturer();
  }

  internalState.p?.redraw();
};

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
  if (internalState.p) {
    throw new Error("UI already attached!");
  }

  const isStartButtonHovered = van.state(false);
  const ui = div(
    {
      style: () =>
        styleObjectToStylesheet({
          position: "fixed",
          border: "1px solid #ccc",
          color: "#fff",
          padding: "8px",
          borderRadius: "8px",
          backgroundColor: "#fff2",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          zIndex: "1000",
          left: `${internalState.positionX.val}px`,
          top: `${internalState.positionY.val}px`,
        }),
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
    div("Status: ", () => (state.isCapturing ? "Capturing" : "Ready")),
    div("Frames: ", () => {
      if (!state.isCapturing) {
        return "-";
      }
      if (state.frames === undefined) {
        return `${state.frameCount}`;
      }
      return `${state.frameCount}/${state.frames}`;
    }),

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
            await startCapturer(p);
          }
        },
      },
      () => (state.isCapturing ? "Stop" : "Start"),
    ),
  );
  van.add(document.body, ui);
  internalState.p = p;
}

/** Start capturing frames */
export async function startCapturer(p: p5, options: Partial<Options> = {}) {
  const realOptions = {
    format: "png",
    frames: undefined,
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
  internalState.frames.val = realOptions.frames;
  internalState.p = p;
  internalState.directoryHandle = handle;

  console.log(`${logPrefix} Started capturing`);

  internalState.wasLooping = p.isLooping();
  p.noLoop();
  // @ts-expect-error undocumented
  p.registerMethod("post", postDraw);
}

/** Stop capturing frames */
export async function stopCapturer() {
  console.log(`${logPrefix} Stopping capturer`);
  internalState.isCapturing.val = false;
  internalState.directoryHandle = undefined;
  if (internalState.wasLooping) {
    internalState.p?.loop();
  }

  // @ts-expect-error undocumented
  internalState.p?.unregisterMethod("post", postDraw);
}
