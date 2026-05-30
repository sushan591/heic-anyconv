import type { InputData } from '../types.js';
import { toUint8Array } from '../utils/buffer.js';

const HEIC_BRANDS = new Set([
  'heic', 'heix', 'hevc', 'hevx',
  'heim', 'heis', 'mif1', 'msf1',
]);

/**
 * Check if the given data looks like a valid HEIC/HEIF file
 * by examining the ISOBMFF ftyp box magic bytes.
 * Very fast, pure JS, no WASM needed.
 */
export function isHeic(data: InputData): boolean {
  const bytes = toUint8Array(data);

  if (bytes.length < 12) return false;

  // ISOBMFF files start with a box: [4 bytes size][4 bytes type]
  // The first box should be 'ftyp'
  const ftyp =
    String.fromCharCode(bytes[4]) +
    String.fromCharCode(bytes[5]) +
    String.fromCharCode(bytes[6]) +
    String.fromCharCode(bytes[7]);

  if (ftyp !== 'ftyp') return false;

  // Major brand starts at offset 8
  const brand =
    String.fromCharCode(bytes[8]) +
    String.fromCharCode(bytes[9]) +
    String.fromCharCode(bytes[10]) +
    String.fromCharCode(bytes[11]);

  return HEIC_BRANDS.has(brand);
}

export function getMimeType(format: string): string {
  switch (format) {
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    case 'tiff': return 'image/tiff';
    case 'raw': return 'application/octet-stream';
    default: return 'application/octet-stream';
  }
}
