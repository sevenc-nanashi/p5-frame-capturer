# p5-frame-capturer / Capture p5.js frames and saves into your local file system

[![npm version](https://img.shields.io/npm/v/p5-frame-capturer)](https://npmjs.com/package/p5-frame-capturer)
[![npm downloads](https://img.shields.io/npm/dm/p5-frame-capturer)](https://npm.chart.dev/p5-frame-capturer)
[![license](https://img.shields.io/github/license/sevenc-nanashi/p5-frame-capturer)](https://github.com/sevenc-nanashi/p5-frame-capturer/blob/main/LICENSE)

Demo: [ESModule Mode](https://sevenc7c.com/p5-frame-capturer/) ([Source: /example](https://github.com/sevenc-nanashi/p5-frame-capturer/tree/main/example)) | [UMD Mode](https://editor.p5js.org/sevenc-nanashi/sketches/WFj8ITs0K)

This is a simple tool to capture frames from a p5.js sketch and save them into your local file system.\
It is useful for creating animations or exporting frames for further processing.\

> [!WARNING]
> This package uses [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API), so it is only available in Chromium-based browsers.

## Usage

### Via script tag (UMD mode, For p5.js web editor)

1. Include following script in your p5.js sketch:

```html
<script src="https://cdn.jsdelivr.net/npm/p5-frame-capturer/dist/umd.js"></script>
```

### Via bundler (ESModule mode, For using with bundlers like Vite)

1. Install the package:

```bash
npm install p5-frame-capturer
```

2. Import the package in your p5.js sketch:

```javascript
import { p5FrameCapturer } from 'p5-frame-capturer';
import p5 from 'p5';

p5.registerAddon(p5FrameCapturer());
const p = new p5((sketch) => /* ... */);
```

## API

Entire api is exported as a global variable `window.p5FrameCapturer`, or use ESModule import.

### `supportedImageFormats: string[]`

List of supported image formats.

- `png`
- `jpeg`
- `webp`
- `webpLossless`

> [!NOTE]\
> `webpLossless` uses wasm-based encoder, so it might be slower than other formats.

### `attachCapturerUi(p5Instance: p5)`

Attaches the frame capturer UI to the p5.js sketch.
On UMD build, this function is automatically called.

### `startCapturer(p5Instance: p5, options: Partial<Options>)`

Starts capturing frames from the p5.js sketch.

#### Options

- `format`: Image format to save the frames. Default: `png`.
- `frames`: Number of frames to capture. You can use `undefined` or `0` to capture frames indefinitely until `stopCapturing()` is called. Default: `undefined`.
- `parallelWriteLimit`: Maximum number of frames to write in parallel. You can use `0` to remove the limit, but this may cause your browser to crash. Default: `8`.
- `onFinished`: Callback function to call when capturing is finished. Will not be called if `frames` is `undefined`. Default: `undefined`.

### `stopCapturer()`

Stops capturing frames.

### `state`

Current state of the capturer.

- `isCapturing`: Whether the capturer is capturing frames.
- `frameCount`: Number of frames captured so far.
- `frames`: Number of frames to capture, or `0` if capturing indefinitely.
- `fps`: Frames captured per second.

## Hints

- You can use `onEnd` callback and [ntfy.sh](https://ntfy.sh) to get a notification when capturing is finished.

```ts
startCapturer(p, {
  onFinished: () =>
    fetch("https://ntfy.sh/your_topic_name", {
      method: "POST",
      body: "All frames are captured!",
      // This line is required to avoid CORS error
      mode: "no-cors",
    }),
});
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

The WebP encoder is built with Rust. The licenses of used crates are available in the [NOTICE.md](NOTICE.md) file.
