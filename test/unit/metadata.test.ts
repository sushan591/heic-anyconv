import { describe, it, expect } from 'vitest';
import { parseExif } from '../../src/metadata/exif-parser.js';
import { injectExifIntoJpeg, injectExifIntoPng, injectExifIntoWebp } from '../../src/metadata/exif-injector.js';

describe('EXIF parser', () => {
  it('returns null for data too short', () => {
    expect(parseExif(new Uint8Array(5))).toBe(null);
  });

  it('returns null for invalid byte order', () => {
    const data = new Uint8Array(20);
    data[0] = 0x00; data[1] = 0x00; // Invalid byte order
    expect(parseExif(data)).toBe(null);
  });

  it('parses TIFF little-endian header with magic 42', () => {
    // Minimal valid TIFF with II byte order, magic 42, and IFD at offset 8 with 0 entries
    const data = new Uint8Array(16);
    data[0] = 0x49; data[1] = 0x49; // II (little-endian)
    data[2] = 0x2A; data[3] = 0x00; // Magic 42
    data[4] = 0x08; data[5] = 0x00; data[6] = 0x00; data[7] = 0x00; // IFD offset = 8
    data[8] = 0x00; data[9] = 0x00; // 0 entries
    const result = parseExif(data);
    expect(result).toEqual({});
  });

  it('handles Exif\\0\\0 prefix', () => {
    const data = new Uint8Array(16);
    // Exif\0\0
    data[0] = 0x45; data[1] = 0x78; data[2] = 0x69; data[3] = 0x66;
    data[4] = 0x00; data[5] = 0x00;
    // TIFF header at offset 6
    data[6] = 0x4D; data[7] = 0x4D; // MM (big-endian)
    data[8] = 0x00; data[9] = 0x2A; // Magic 42
    data[10] = 0x00; data[11] = 0x00; data[12] = 0x00; data[13] = 0x08; // IFD offset = 8
    data[14] = 0x00; data[15] = 0x00; // 0 entries
    const result = parseExif(data);
    expect(result).toEqual({});
  });
});

describe('EXIF injector - JPEG', () => {
  it('injects EXIF into valid JPEG', () => {
    const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x02, 0xFF, 0xD9]);
    const exif = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);

    const result = injectExifIntoJpeg(jpeg, exif);

    // Should start with FF D8
    expect(result[0]).toBe(0xFF);
    expect(result[1]).toBe(0xD8);
    // Should have APP1 marker
    expect(result[2]).toBe(0xFF);
    expect(result[3]).toBe(0xE1);
    // Rest of original JPEG should follow
    expect(result.length).toBe(jpeg.length + 4 + exif.length);
  });

  it('returns original if not valid JPEG', () => {
    const notJpeg = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);
    const exif = new Uint8Array([0x45, 0x78]);
    expect(injectExifIntoJpeg(notJpeg, exif)).toBe(notJpeg);
  });
});

describe('EXIF injector - PNG', () => {
  it('injects eXIf chunk before IDAT', () => {
    // Minimal PNG: signature + IHDR chunk + IDAT chunk + IEND
    const png = new Uint8Array([
      // PNG signature
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      // IHDR chunk: length=13, type=IHDR, data(13 bytes), CRC(4 bytes)
      0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // CRC placeholder
      // IDAT chunk: length=0, type=IDAT, CRC(4 bytes)
      0x00, 0x00, 0x00, 0x00,
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x00, 0x00, 0x00, 0x00, // CRC placeholder
    ]);

    const exif = new Uint8Array([0x49, 0x49, 0x2A, 0x00]);
    const result = injectExifIntoPng(png, exif);

    // Should be larger than original
    expect(result.length).toBeGreaterThan(png.length);
    // Should still start with PNG signature
    expect(result[0]).toBe(0x89);
    expect(result[1]).toBe(0x50);
  });
});

describe('EXIF injector - WebP', () => {
  it('injects EXIF chunk into RIFF container', () => {
    const webp = new Uint8Array([
      // RIFF header
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x10, 0x00, 0x00, 0x00, // file size (little-endian)
      0x57, 0x45, 0x42, 0x50, // WEBP
      // VP8 chunk (minimal)
      0x56, 0x50, 0x38, 0x20, // VP8
      0x04, 0x00, 0x00, 0x00, // chunk size
      0x00, 0x00, 0x00, 0x00, // data
    ]);

    const exif = new Uint8Array([0x49, 0x49]);
    const result = injectExifIntoWebp(webp, exif);

    expect(result.length).toBeGreaterThan(webp.length);
    // RIFF header preserved
    expect(String.fromCharCode(result[0], result[1], result[2], result[3])).toBe('RIFF');
  });
});
