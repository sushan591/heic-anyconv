import { describe, it, expect } from 'vitest';
import { parseExif, extractExifFromHeic } from '../../src/metadata/exif-parser.js';

describe('EXIF parser', () => {
  it('returns null for data too short', () => {
    expect(parseExif(new Uint8Array(5))).toBe(null);
  });

  it('returns null for invalid byte order', () => {
    const data = new Uint8Array(20);
    data[0] = 0x00; data[1] = 0x00;
    expect(parseExif(data)).toBe(null);
  });

  it('parses TIFF little-endian header with magic 42', () => {
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
    data[0] = 0x45; data[1] = 0x78; data[2] = 0x69; data[3] = 0x66;
    data[4] = 0x00; data[5] = 0x00;
    data[6] = 0x4D; data[7] = 0x4D; // MM (big-endian)
    data[8] = 0x00; data[9] = 0x2A; // Magic 42
    data[10] = 0x00; data[11] = 0x00; data[12] = 0x00; data[13] = 0x08; // IFD offset = 8
    data[14] = 0x00; data[15] = 0x00; // 0 entries
    const result = parseExif(data);
    expect(result).toEqual({});
  });
});

describe('extractExifFromHeic', () => {
  it('returns null when no Exif marker found', () => {
    const data = new Uint8Array(100).fill(0);
    expect(extractExifFromHeic(data)).toBe(null);
  });

  it('extracts bytes starting from Exif marker', () => {
    const prefix = new Uint8Array(50);
    const exifHeader = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
    const tiffData = new Uint8Array(20).fill(0x42);

    const full = new Uint8Array(prefix.length + exifHeader.length + tiffData.length);
    full.set(prefix, 0);
    full.set(exifHeader, prefix.length);
    full.set(tiffData, prefix.length + exifHeader.length);

    const result = extractExifFromHeic(full);
    expect(result).not.toBeNull();
    // Should start with Exif header
    expect(result![0]).toBe(0x45);
    expect(result![1]).toBe(0x78);
    expect(result![2]).toBe(0x69);
    expect(result![3]).toBe(0x66);
  });
});
