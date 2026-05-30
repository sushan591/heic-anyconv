import type { OutputFormat, ResizeOptions } from '../types.js';

export interface EncodeInput {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  format: OutputFormat;
  quality: number;
  resize?: ResizeOptions;
}

export interface Encoder {
  readonly name: string;
  readonly supportedFormats: OutputFormat[];
  encode(input: EncodeInput): Promise<Uint8Array>;
  supportsFormat(format: OutputFormat): boolean;
}
