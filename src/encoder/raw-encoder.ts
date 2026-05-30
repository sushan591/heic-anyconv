import type { Encoder, EncodeInput } from './encoder.types.js';

export const rawEncoder: Encoder = {
  name: 'raw',
  supportedFormats: ['raw'],

  supportsFormat(format) {
    return format === 'raw';
  },

  async encode(input: EncodeInput): Promise<Uint8Array> {
    return new Uint8Array(input.pixels.buffer, input.pixels.byteOffset, input.pixels.byteLength);
  },
};
