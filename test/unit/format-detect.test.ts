import { describe, it, expect } from 'vitest';
import { isHeic } from '../../src/decoder/format-detect.js';

function makeHeicHeader(brand: string): Uint8Array {
  // Minimal ftyp box: [size:4][ftyp:4][brand:4]
  const data = new Uint8Array(12);
  // Size (doesn't matter for detection)
  data[0] = 0; data[1] = 0; data[2] = 0; data[3] = 20;
  // 'ftyp'
  data[4] = 0x66; data[5] = 0x74; data[6] = 0x79; data[7] = 0x70;
  // Brand
  for (let i = 0; i < 4; i++) {
    data[8 + i] = brand.charCodeAt(i);
  }
  return data;
}

describe('isHeic', () => {
  it('returns true for heic brand', () => {
    expect(isHeic(makeHeicHeader('heic'))).toBe(true);
  });

  it('returns true for heix brand', () => {
    expect(isHeic(makeHeicHeader('heix'))).toBe(true);
  });

  it('returns true for hevc brand', () => {
    expect(isHeic(makeHeicHeader('hevc'))).toBe(true);
  });

  it('returns true for mif1 brand', () => {
    expect(isHeic(makeHeicHeader('mif1'))).toBe(true);
  });

  it('returns true for msf1 brand (sequence)', () => {
    expect(isHeic(makeHeicHeader('msf1'))).toBe(true);
  });

  it('returns false for JPEG data', () => {
    const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(isHeic(jpeg)).toBe(false);
  });

  it('returns false for PNG data', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    expect(isHeic(png)).toBe(false);
  });

  it('returns false for random bytes', () => {
    const random = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(isHeic(random)).toBe(false);
  });

  it('returns false for empty data', () => {
    expect(isHeic(new Uint8Array(0))).toBe(false);
  });

  it('returns false for data shorter than 12 bytes', () => {
    expect(isHeic(new Uint8Array(8))).toBe(false);
  });

  it('returns false for unknown brand with ftyp box', () => {
    expect(isHeic(makeHeicHeader('mp41'))).toBe(false);
  });

  it('works with ArrayBuffer input', () => {
    const header = makeHeicHeader('heic');
    expect(isHeic(header.buffer)).toBe(true);
  });

  it('works with Buffer input', () => {
    const header = makeHeicHeader('heic');
    expect(isHeic(Buffer.from(header))).toBe(true);
  });
});
