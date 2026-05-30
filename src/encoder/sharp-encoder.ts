import type { Encoder, EncodeInput } from './encoder.types.js';
import type { OutputFormat } from '../types.js';

export async function createSharpEncoder(): Promise<Encoder | null> {
  try {
    const sharpMod = await import('sharp');
    const sharp = sharpMod.default;

    const encoder: Encoder = {
      name: 'sharp',
      supportedFormats: ['jpeg', 'png', 'webp', 'avif', 'tiff'],

      supportsFormat(format: OutputFormat) {
        return this.supportedFormats.includes(format);
      },

      async encode(input: EncodeInput): Promise<Uint8Array> {
        // Create Sharp instance from raw RGBA pixel data
        let pipeline = sharp(Buffer.from(input.pixels.buffer, input.pixels.byteOffset, input.pixels.byteLength), {
          raw: {
            width: input.width,
            height: input.height,
            channels: 4,
          },
        });

        // Apply resize if requested
        if (input.resize) {
          pipeline = pipeline.resize({
            width: input.resize.width,
            height: input.resize.height,
            fit: input.resize.fit ?? 'inside',
          });
        }

        // Convert quality from 0-1 to format-specific ranges
        const quality = Math.round(input.quality * 100);

        switch (input.format) {
          case 'jpeg':
            pipeline = pipeline.jpeg({ quality });
            break;
          case 'png':
            pipeline = pipeline.png();
            break;
          case 'webp':
            pipeline = pipeline.webp({ quality });
            break;
          case 'avif':
            pipeline = pipeline.avif({ quality });
            break;
          case 'tiff':
            pipeline = pipeline.tiff({ quality });
            break;
        }

        const outputBuffer = await pipeline.toBuffer();
        return new Uint8Array(outputBuffer.buffer, outputBuffer.byteOffset, outputBuffer.byteLength);
      },
    };

    return encoder;
  } catch {
    // Sharp not available
    return null;
  }
}
