import type { Encoder } from './encoder.types.js';
import type { OutputFormat } from '../types.js';
import { rawEncoder } from './raw-encoder.js';
import { createSharpEncoder } from './sharp-encoder.js';
import { createCanvasEncoder } from './canvas-encoder.js';
import { UnsupportedFormatError } from '../errors.js';

let resolvedEncoder: Encoder | null = null;

async function resolveEncoder(): Promise<Encoder> {
  if (resolvedEncoder) return resolvedEncoder;

  // Try Sharp first (best quality and format support)
  const sharp = await createSharpEncoder();
  if (sharp) {
    resolvedEncoder = sharp;
    return resolvedEncoder;
  }

  // Try Canvas encoder (browser environments)
  const canvas = createCanvasEncoder();
  if (canvas) {
    resolvedEncoder = canvas;
    return resolvedEncoder;
  }

  // TODO: Add WASM encoder fallback (Phase 4)

  throw new UnsupportedFormatError(
    'any encoded format',
    'none — no encoder available. Install Sharp (`npm install sharp`) for Node.js encoding support',
  );
}

export async function encode(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  format: OutputFormat,
  quality: number,
  resize?: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' },
): Promise<Uint8Array> {
  // Raw format doesn't need an encoder
  if (format === 'raw') {
    return rawEncoder.encode({ pixels, width, height, format, quality });
  }

  const encoder = await resolveEncoder();

  if (!encoder.supportsFormat(format)) {
    throw new UnsupportedFormatError(format, encoder.name);
  }

  return encoder.encode({ pixels, width, height, format, quality, resize });
}

export { rawEncoder } from './raw-encoder.js';
export type { Encoder, EncodeInput } from './encoder.types.js';
