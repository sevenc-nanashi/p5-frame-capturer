import type p5 from "p5";
import * as p5FrameCapturer from "./index.ts";

declare global {
  interface Window {
    p5FrameCapturer: typeof p5FrameCapturer;
    p5: typeof p5 | undefined;
  }
}

window.p5FrameCapturer = p5FrameCapturer;
if (window.p5) {
  window.p5.registerAddon(p5FrameCapturer.p5FrameCapturer());
}
