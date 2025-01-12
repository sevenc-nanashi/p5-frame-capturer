# p5-frame-capturer / Capture p5.js frames and saves into your local file system

[![npm version](https://img.shields.io/npm/v/p5-frame-capturer)](https://npmjs.com/package/p5-frame-capturer)
[![npm downloads](https://img.shields.io/npm/dm/p5-frame-capturer)](https://npm.chart.dev/p5-frame-capturer)
[![license](https://img.shields.io/github/license/sevenc-nanashi/p5-frame-capturer)](https://github.com/sevenc-nanashi/p5-frame-capturer/blob/main/LICENSE)

This is a simple tool to capture frames from a p5.js sketch and save them into your local file system.
It is useful for creating animations or exporting frames for further processing.

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
import { attachCapturerUi } from 'p5-frame-capturer';
import p5 from 'p5';

const p = new p5((sketch) => /* ... */);
attachCapturerUi(p);
```

## API

Entire api is exported as a global variable `window.p5FrameCapturer`, or use ESModule import.

### `supportedImageFormats: string[]`

List of supported image formats.

- `png`
- `jpeg`
- `webp`

### `attachCapturerUi(p5Instance: p5)`

Attaches the frame capturer UI to the p5.js sketch.
On UMD build, this function is automatically called.

### `startCapturer(p5Instance: p5, options: Partial<Options>)`

Starts capturing frames from the p5.js sketch.

#### Options

- `format`: Image format to save the frames. Default is `png`.
- `frames`: Number of frames to capture. You can use `undefined` to capture frames indefinitely until `stopCapturing()` is called. Default is `undefined`.

### `startCapturer()`

Stops capturing frames.

### `state`

Current state of the capturer.

- `isCapturing`: Whether the capturer is capturing frames.
- `frameCount`: Number of frames captured so far.
- `frames`: Number of frames to capture, or `undefined` if capturing indefinitely.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
