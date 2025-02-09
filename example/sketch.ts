import p5 from "p5";
import { attachCapturerUi, state } from "p5-frame-capturer";

const sketch = (p: p5) => {
  attachCapturerUi(p);
  p.setup = () => {
    p.createCanvas(400, 400);
  };

  p.draw = () => {
    p.background(200);
    const radius = 100;

    // You can use state.frameCount to get number of frames captured.
    // This is useful for creating music visualizers, for example.
    const frameCount = state.isCapturing ? state.frameCount : p.frameCount;

    const x = Math.cos(frameCount * 0.01) * radius;
    const y = Math.sin(frameCount * 0.01) * radius;
    p.line(
      p.width / 2 + x,
      p.height / 2 + y,
      p.width / 2 - x,
      p.height / 2 - y,
    );
    p.ellipse(p.width / 2 + x, p.height / 2 + y, 50, 50);
  };
};

new p5(sketch);
