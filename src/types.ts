export type InputData = Uint8Array | ArrayBuffer;

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'raw';

export interface ConvertOptions {
  /** The HEIC/HEIF file data */
  data: InputData;

  /** Desired output format. Default: 'jpeg' */
  format?: OutputFormat;

  /** Output quality 0-1 for lossy formats (jpeg, webp). Default: 0.92 */
  quality?: number;

  /** Resize options. If omitted, original dimensions are preserved. */
  resize?: ResizeOptions;

  /** Whether to extract EXIF/XMP metadata and include in result. Default: true */
  preserveMetadata?: boolean;

  /**
   * For multi-image HEIC files, which image to extract.
   * 0 = primary image (default), specific index, or 'all'.
   */
  imageIndex?: number | 'all';

  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
}

export interface ConvertResult {
  /** Encoded image data */
  data: Uint8Array;

  /** The format that was produced */
  format: OutputFormat;

  /** Width of the output image in pixels */
  width: number;

  /** Height of the output image in pixels */
  height: number;

  /** MIME type string, e.g. 'image/jpeg' */
  mimeType: string;

  /** Extracted metadata, if preserveMetadata was true */
  metadata?: ImageMetadata;
}

export interface RawPixelResult {
  /** Raw RGBA pixel data */
  data: Uint8ClampedArray;

  /** Width in pixels */
  width: number;

  /** Height in pixels */
  height: number;

  /** Always 4 (RGBA) */
  channels: 4;

  /** Extracted metadata */
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  exif?: Record<string, unknown>;
  xmp?: string;
}

export interface ImageInfo {
  /** Number of images in the HEIC container */
  imageCount: number;

  /** Index of the primary image */
  primaryIndex: number;

  /** Per-image dimensions */
  images: Array<{ width: number; height: number; isThumb: boolean }>;

  /** Whether the file contains a sequence (animation/burst) */
  isSequence: boolean;

  /** Extracted metadata from the container */
  metadata?: ImageMetadata;
}

export interface InitOptions {
  /** URL to the .wasm file (browser) */
  wasmPath?: string;

  /** A pre-compiled WebAssembly.Module (e.g. for Cloudflare Workers) */
  wasmModule?: WebAssembly.Module;
}
