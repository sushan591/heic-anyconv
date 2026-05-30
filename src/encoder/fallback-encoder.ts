import type { Encoder, EncodeInput } from './encoder.types.js';
import type { OutputFormat } from '../types.js';
import { UnsupportedFormatError } from '../errors.js';

/**
 * Fallback encoder using upng-js for PNG output.
 * Used when Sharp is not available and Canvas API is not present.
 * For JPEG/WebP/AVIF/TIFF, users should install Sharp.
 */
export function createFallbackEncoder(): Encoder {
  return {
    name: 'fallback',
    supportedFormats: ['png'],

    supportsFormat(format: OutputFormat) {
      return format === 'png';
    },

    async encode(input: EncodeInput): Promise<Uint8Array> {
      if (input.format !== 'png') {
        throw new UnsupportedFormatError(
          input.format,
          'fallback (only PNG is supported without Sharp). Install Sharp for full format support: npm install sharp',
        );
      }

      const UPNG = await import('upng-js');
      const { pixels, width, height } = input;

      // Copy to a fresh ArrayBuffer to avoid SharedArrayBuffer issues
      const copy = new Uint8Array(pixels.length);
      copy.set(pixels);

      // cnum=0 means lossless PNG
      const encoded = UPNG.encode([copy.buffer as ArrayBuffer], width, height, 0);
      return new Uint8Array(encoded);
    },
  };
}
