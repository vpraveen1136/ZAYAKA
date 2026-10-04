import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  // getPixel(x, y) => [r, g, b, a] (0-255)
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ byte) & 1) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc = crc >>> 1;
        }
        byte = byte >>> 1;
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Draw warm food-catalogue icon
function renderZayakaIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background: Warm Cream with subtle radial vignette
  const dx = nx - 0.5;
  const dy = ny - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded squircle mask for non-maskable or rounded border
  const cornerR = 0.22;
  const cx = Math.max(Math.abs(dx) - (0.5 - cornerR), 0);
  const cy = Math.max(Math.abs(dy) - (0.5 - cornerR), 0);
  const cornerDist = Math.sqrt(cx * cx + cy * cy);
  if (cornerDist > cornerR) {
    return [0, 0, 0, 0];
  }

  // Base cream color #FBF8F3 to #F3ECE1
  let r = Math.round(251 - dist * 25);
  let g = Math.round(248 - dist * 35);
  let b = Math.round(243 - dist * 45);
  let a = 255;

  // Center Pot Graphic (Terracotta #C85A17, Gold #E88B2A)
  // Pot Lid: semicircle/oval around center (0.5, 0.44)
  const potCenterX = 0.5;
  const potCenterY = 0.56;

  // Aroma steam lines above pot (0.42 to 0.26)
  if (ny > 0.22 && ny < 0.38) {
    const steamX1 = 0.42 + Math.sin(ny * 25) * 0.025;
    const steamX2 = 0.50 + Math.sin((ny + 0.1) * 25) * 0.025;
    const steamX3 = 0.58 + Math.sin(ny * 25) * 0.025;
    if (Math.abs(nx - steamX1) < 0.014 || Math.abs(nx - steamX2) < 0.015 || Math.abs(nx - steamX3) < 0.014) {
      return [217, 83, 30, 220]; // Warm terracotta steam
    }
  }

  // Pot Lid knob
  const knobDist = Math.hypot(nx - potCenterX, ny - 0.39);
  if (knobDist < 0.04) {
    return [178, 59, 8, 255];
  }

  // Pot Lid dome
  if (ny >= 0.40 && ny <= 0.48) {
    const lidW = 0.24 * Math.sqrt(Math.max(0, 1 - Math.pow((0.48 - ny) / 0.09, 2)));
    if (Math.abs(nx - potCenterX) <= lidW + 0.02) {
      return [232, 139, 42, 255]; // Gold
    }
  }

  // Pot Rim band
  if (ny >= 0.48 && ny <= 0.51) {
    if (Math.abs(nx - potCenterX) <= 0.26) {
      return [200, 90, 23, 255];
    }
  }

  // Pot Body (tapering bowl)
  if (ny > 0.51 && ny <= 0.72) {
    const bodyT = (ny - 0.51) / 0.21;
    const halfWidth = 0.25 - bodyT * 0.07;
    if (Math.abs(nx - potCenterX) <= halfWidth) {
      // Golden 'Z' emblem in middle of pot body
      if (ny >= 0.56 && ny <= 0.67 && Math.abs(nx - potCenterX) <= 0.08) {
        const zx = (nx - (potCenterX - 0.08)) / 0.16;
        const zy = (ny - 0.56) / 0.11;
        const onTop = zy < 0.22 && zx > 0.1 && zx < 0.9;
        const onBottom = zy > 0.78 && zx > 0.1 && zx < 0.9;
        const onDiag = Math.abs((1 - zy) - zx) < 0.16;
        if (onTop || onBottom || onDiag) {
          return [255, 253, 249, 255]; // Crisp white/cream 'Z'
        }
      }
      return [200, 90, 23, 255]; // Terracotta pot
    }
    // Handles
    if (ny >= 0.52 && ny <= 0.60) {
      if (Math.abs(nx - potCenterX) <= halfWidth + 0.05 && Math.abs(nx - potCenterX) >= halfWidth) {
        return [232, 139, 42, 255]; // Brass gold handles
      }
    }
  }

  return [r, g, b, a];
}

const iconsDir = path.resolve('public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icon-192.png
const png192 = createPNG(192, 192, renderZayakaIcon);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);

// Generate icon-512.png
const png512 = createPNG(512, 512, renderZayakaIcon);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);

// Generate icon-maskable-512.png
const pngMaskable = createPNG(512, 512, (x, y, w, h) => {
  // Fully fill background for maskable
  const p = renderZayakaIcon(x, y, w, h);
  if (p[3] === 0) return [251, 248, 243, 255];
  return p;
});
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), pngMaskable);

// Apple touch icon (180x180)
const appleIcon = createPNG(180, 180, renderZayakaIcon);
fs.writeFileSync(path.resolve('public', 'apple-touch-icon.png'), appleIcon);

console.log('Icons generated successfully!');
