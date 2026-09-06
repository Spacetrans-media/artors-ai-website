/**
 * Builds the site icons from the wordmark.
 *
 *   npm run icons
 *
 * The favicon is the "a" cropped out of public/artors-wordmark.png rather than
 * an "a" redrawn in SVG. The letterform and its blue-to-cyan gradient are the
 * brand; an approximation would be subtly wrong in the one place the brand is
 * seen most often and smallest.
 *
 * The crop is found rather than hardcoded: transparent columns separate the
 * letter groups, so the script locates them each time and still works if the
 * wordmark is ever re-exported at a different size.
 *
 * Three outputs, because browsers disagree:
 *   app/icon.png        transparent, what modern browsers use in the tab
 *   app/apple-icon.png  on white — iOS composites transparency onto black
 *   app/favicon.ico     a PNG inside an ICO container, for /favicon.ico
 */
import sharp from "sharp";
import fs from "node:fs/promises";

const SRC = "public/artors-wordmark.png";
const CANVAS = 512;
/** How much of the canvas the letter fills. Too small reads as a grey smudge. */
const INSET = 0.8;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const alphaAt = (x, y) => data[(y * width + x) * channels + 3];

/** First run of columns containing ink — the "a". */
function firstLetterBox() {
  let x0 = -1;
  let x1 = -1;
  for (let x = 0; x < width; x++) {
    const ink = Array.from({ length: height }, (_, y) => alphaAt(x, y)).some((a) => a > 12);
    if (ink && x0 === -1) x0 = x;
    if (!ink && x0 !== -1) {
      x1 = x - 1;
      break;
    }
  }
  if (x1 === -1) x1 = width - 1;

  let y0 = height;
  let y1 = 0;
  for (let x = x0; x <= x1; x++) {
    for (let y = 0; y < height; y++) {
      if (alphaAt(x, y) > 12) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const box = firstLetterBox();
console.log(`letter found at x ${box.left}, y ${box.top}, ${box.width}x${box.height}`);

const letter = await sharp(SRC)
  .extract(box)
  .resize({
    width: Math.round(CANVAS * INSET),
    height: Math.round(CANVAS * INSET),
    fit: "inside",
    kernel: "lanczos3",
  })
  .toBuffer();

/**
 * Returns a finished square PNG buffer.
 *
 * Each size is rendered from its own buffer rather than by chaining .resize()
 * onto the composite: sharp applies resize BEFORE composite, so chaining
 * shrinks the canvas under the letter and fails with "image to composite must
 * have same dimensions or smaller".
 */
const centred = (background) =>
  sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background } })
    .composite([{ input: letter, gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

const transparent = await centred({ r: 0, g: 0, b: 0, alpha: 0 });
const onWhite = await centred({ r: 255, g: 255, b: 255, alpha: 1 });

await fs.writeFile("app/icon.png", transparent);
await sharp(onWhite)
  .resize(180, 180, { kernel: "lanczos3" })
  .png({ compressionLevel: 9, palette: true })
  .toFile("app/apple-icon.png");

/**
 * An ICO wrapping a 32x32 PNG.
 *
 * The format allows PNG payloads rather than only BMP, which every browser
 * still asking for /favicon.ico supports, and it saves pulling in an encoder
 * for a file this small.
 */
const png32 = await sharp(transparent)
  .resize(32, 32, { kernel: "lanczos3" })
  .png({ compressionLevel: 9 })
  .toBuffer();

const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0); // reserved
dir.writeUInt16LE(1, 2); // type: icon
dir.writeUInt16LE(1, 4); // one image

const entry = Buffer.alloc(16);
entry[0] = 32; // width
entry[1] = 32; // height
entry[2] = 0; // palette
entry[3] = 0; // reserved
entry.writeUInt16LE(1, 4); // colour planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png32.length, 8);
entry.writeUInt32LE(dir.length + entry.length, 12); // offset to the payload

await fs.writeFile("app/favicon.ico", Buffer.concat([dir, entry, png32]));

console.log("wrote app/icon.png (512), app/apple-icon.png (180), app/favicon.ico (32)");
