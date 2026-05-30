import type { Encoder } from './encoder.types.js';
import type { OutputFormat } from '../types.js';
import { rawEncoder } from './raw-encoder.js';
import { createCanvasEncoder } from './canvas-encoder.js';
import { createFallbackEncoder } from './fallback-encoder.js';
import { UnsupportedFormatError } from '../errors.js';

let resolvedEncoder: Encoder | null = null;

function resolveEncoder(): Encoder {
  if (resolvedEncoder) return resolvedEncoder;

  const canvas = createCanvasEncoder();
  if (canvas) {
    resolvedEncoder = canvas;
    return resolvedEncoder;
  }

  resolvedEncoder = createFallbackEncoder();
  return resolvedEncoder;
}

export async function encode(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  format: OutputFormat,
  quality: number,
  resize?: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' },
): Promise<Uint8Array> {
  if (format === 'raw') {
    return rawEncoder.encode({ pixels, width, height, format, quality });
  }

  const encoder = resolveEncoder();

  if (!encoder.supportsFormat(format)) {
    throw new UnsupportedFormatError(format, encoder.name);
  }

  return encoder.encode({ pixels, width, height, format, quality, resize });
}

export { rawEncoder } from './raw-encoder.js';
export type { Encoder, EncodeInput } from './encoder.types.js';
