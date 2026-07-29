import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const width = 360;
const height = 200;
const frameCount = 18;
const outPath = path.resolve("assets", "dimension-link.gif");

const palette = [
  [13, 8, 28],
  [28, 16, 54],
  [53, 29, 93],
  [95, 58, 176],
  [255, 96, 178],
  [72, 224, 255],
  [222, 244, 255],
  [255, 255, 255],
];

while (palette.length < 256) {
  palette.push([0, 0, 0]);
}

function word(value) {
  return [value & 0xff, (value >> 8) & 0xff];
}

function gifString(value) {
  return [...Buffer.from(value, "ascii")];
}

function colorTable() {
  return palette.flat();
}

function setPixel(pixels, x, y, color) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  pixels[y * width + x] = color;
}

function drawCircle(pixels, cx, cy, radius, color) {
  const r2 = radius * radius;
  const inner = (radius - 2) * (radius - 2);

  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = dx * dx + dy * dy;
      if (distance <= r2 && distance >= inner) {
        setPixel(pixels, x, y, color);
      }
    }
  }
}

function drawLine(pixels, x1, y1, x2, y2, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    setPixel(pixels, x, y, color);
    setPixel(pixels, x, y + 1, color);
  }
}

function framePixels(frame) {
  const pixels = new Uint8Array(width * height).fill(0);
  const pulse = frame / frameCount;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - cx) / width;
      const dy = (y - cy) / height;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 0.44) pixels[y * width + x] = 1;
      if (distance < 0.26) pixels[y * width + x] = 2;
    }
  }

  for (let index = 0; index < 42; index += 1) {
    const x = (index * 83 + frame * 11) % width;
    const y = (index * 47 + frame * 7) % height;
    setPixel(pixels, x, y, index % 5 === 0 ? 7 : 6);
  }

  drawLine(pixels, 42, cy, width - 42, cy, 5);
  drawLine(pixels, 86, cy - 44, width - 86, cy + 44, 3);
  drawLine(pixels, 86, cy + 44, width - 86, cy - 44, 4);

  for (let ring = 0; ring < 4; ring += 1) {
    const radius = 20 + ring * 22 + pulse * 18;
    drawCircle(pixels, cx, cy, radius, ring % 2 === 0 ? 5 : 4);
  }

  drawCircle(pixels, 68, cy, 18 + Math.sin(pulse * Math.PI * 2) * 3, 4);
  drawCircle(pixels, width - 68, cy, 18 + Math.cos(pulse * Math.PI * 2) * 3, 5);
  drawCircle(pixels, cx, cy, 9, 7);

  return pixels;
}

function packCodes(codes) {
  let current = 0;
  let bits = 0;
  const bytes = [];

  for (const code of codes) {
    current |= code << bits;
    bits += 9;

    while (bits >= 8) {
      bytes.push(current & 0xff);
      current >>= 8;
      bits -= 8;
    }
  }

  if (bits > 0) {
    bytes.push(current & 0xff);
  }

  return bytes;
}

function imageData(pixels) {
  const clear = 256;
  const end = 257;
  const codes = [];

  for (let index = 0; index < pixels.length; index += 250) {
    codes.push(clear);
    for (const pixel of pixels.slice(index, index + 250)) {
      codes.push(pixel);
    }
  }

  codes.push(end);

  const bytes = packCodes(codes);
  const blocks = [];

  for (let index = 0; index < bytes.length; index += 255) {
    const block = bytes.slice(index, index + 255);
    blocks.push(block.length, ...block);
  }

  blocks.push(0);
  return blocks;
}

const bytes = [
  ...gifString("GIF89a"),
  ...word(width),
  ...word(height),
  0xf7,
  0,
  0,
  ...colorTable(),
  0x21,
  0xff,
  0x0b,
  ...gifString("NETSCAPE2.0"),
  0x03,
  0x01,
  0,
  0,
  0,
];

for (let frame = 0; frame < frameCount; frame += 1) {
  bytes.push(
    0x21,
    0xf9,
    0x04,
    0x04,
    ...word(6),
    0,
    0,
    0x2c,
    ...word(0),
    ...word(0),
    ...word(width),
    ...word(height),
    0,
    8,
    ...imageData(framePixels(frame)),
  );
}

bytes.push(0x3b);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, Buffer.from(bytes));
console.log(outPath);
