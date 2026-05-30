/**
 * Inject raw EXIF data into encoded image output.
 * Supports JPEG (APP1 segment) and PNG (eXIf chunk).
 */

/**
 * Inject EXIF data into a JPEG buffer.
 * Inserts an APP1 segment right after the SOI marker (FF D8).
 */
export function injectExifIntoJpeg(jpeg: Uint8Array, exifData: Uint8Array): Uint8Array {
  // JPEG must start with FF D8
  if (jpeg[0] !== 0xFF || jpeg[1] !== 0xD8) {
    return jpeg;
  }

  // Build APP1 segment: FF E1 [length:2] [exif data]
  const segmentLength = exifData.length + 2; // +2 for the length field itself
  const app1 = new Uint8Array(4 + exifData.length);
  app1[0] = 0xFF;
  app1[1] = 0xE1;
  app1[2] = (segmentLength >> 8) & 0xFF;
  app1[3] = segmentLength & 0xFF;
  app1.set(exifData, 4);

  // Insert after SOI (2 bytes)
  const result = new Uint8Array(2 + app1.length + (jpeg.length - 2));
  result[0] = 0xFF;
  result[1] = 0xD8;
  result.set(app1, 2);
  result.set(jpeg.subarray(2), 2 + app1.length);

  return result;
}

/**
 * Inject EXIF data into a PNG buffer.
 * Adds an eXIf chunk before the first IDAT chunk (PNG 1.5 spec).
 */
export function injectExifIntoPng(png: Uint8Array, exifData: Uint8Array): Uint8Array {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A (8 bytes)
  if (png.length < 8 || png[0] !== 0x89 || png[1] !== 0x50) {
    return png;
  }

  // Find the first IDAT chunk to insert eXIf before it
  let offset = 8; // Skip PNG signature
  let idatOffset = -1;

  while (offset + 8 <= png.length) {
    const view = new DataView(png.buffer, png.byteOffset + offset, 8);
    const chunkLength = view.getUint32(0, false);
    const chunkType = String.fromCharCode(png[offset + 4], png[offset + 5], png[offset + 6], png[offset + 7]);

    if (chunkType === 'IDAT') {
      idatOffset = offset;
      break;
    }

    // Move to next chunk: length(4) + type(4) + data(chunkLength) + crc(4)
    offset += 12 + chunkLength;
  }

  if (idatOffset === -1) {
    return png; // No IDAT found, return as-is
  }

  // Build eXIf chunk: [length:4][eXIf:4][data][crc:4]
  const chunkData = exifData;
  const chunkSize = 12 + chunkData.length; // 4 length + 4 type + data + 4 CRC
  const exifChunk = new Uint8Array(chunkSize);
  const chunkView = new DataView(exifChunk.buffer);

  // Length
  chunkView.setUint32(0, chunkData.length, false);
  // Type: "eXIf"
  exifChunk[4] = 0x65; // e
  exifChunk[5] = 0x58; // X
  exifChunk[6] = 0x49; // I
  exifChunk[7] = 0x66; // f
  // Data
  exifChunk.set(chunkData, 8);
  // CRC (over type + data)
  const crc = crc32(exifChunk.subarray(4, 8 + chunkData.length));
  chunkView.setUint32(8 + chunkData.length, crc, false);

  // Combine: before IDAT + eXIf chunk + from IDAT onwards
  const result = new Uint8Array(png.length + chunkSize);
  result.set(png.subarray(0, idatOffset), 0);
  result.set(exifChunk, idatOffset);
  result.set(png.subarray(idatOffset), idatOffset + chunkSize);

  return result;
}

/**
 * Inject EXIF data into a WebP buffer.
 * Adds an EXIF chunk to the RIFF container.
 */
export function injectExifIntoWebp(webp: Uint8Array, exifData: Uint8Array): Uint8Array {
  // WebP starts with RIFF....WEBP
  if (webp.length < 12) return webp;
  const riff = String.fromCharCode(webp[0], webp[1], webp[2], webp[3]);
  const webpSig = String.fromCharCode(webp[8], webp[9], webp[10], webp[11]);
  if (riff !== 'RIFF' || webpSig !== 'WEBP') return webp;

  // Build EXIF chunk: "EXIF" + size(4) + data + padding
  const padded = exifData.length % 2 === 1;
  const chunkSize = 8 + exifData.length + (padded ? 1 : 0);
  const exifChunk = new Uint8Array(chunkSize);
  // "EXIF"
  exifChunk[0] = 0x45; exifChunk[1] = 0x58; exifChunk[2] = 0x49; exifChunk[3] = 0x46;
  // Size (little-endian)
  const sizeView = new DataView(exifChunk.buffer);
  sizeView.setUint32(4, exifData.length, true);
  exifChunk.set(exifData, 8);

  // Append to the end of the RIFF container
  const result = new Uint8Array(webp.length + chunkSize);
  result.set(webp);
  result.set(exifChunk, webp.length);

  // Update RIFF file size (bytes 4-7, little-endian)
  const resultView = new DataView(result.buffer);
  resultView.setUint32(4, result.length - 8, true);

  return result;
}

// CRC32 lookup table for PNG chunk CRC
let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crcTable[n] = c;
  }
  return crcTable;
}

function crc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
