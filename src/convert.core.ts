import type {
  ConvertOptions,
  ConvertResult,
  RawPixelResult,
  ImageInfo,
  ImageMetadata,
  InputData,
  OutputFormat,
} from './types.js';
import { toUint8Array } from './utils/buffer.js';
import { isHeic, getMimeType } from './decoder/format-detect.js';
import { decodeHeif } from './decoder/heif-decoder.js';
import { extractExifFromHeic, parseExif } from './metadata/exif-parser.js';
import { injectExifIntoJpeg, injectExifIntoPng, injectExifIntoWebp } from './metadata/exif-injector.js';
import { extractXmpFromHeic } from './metadata/xmp-parser.js';
import { InvalidInputError, AbortError } from './errors.js';

export type EncodeFn = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  format: OutputFormat,
  quality: number,
  resize?: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' },
) => Promise<Uint8Array>;

function validateInput(data: InputData): Uint8Array {
  const bytes = toUint8Array(data);

  if (bytes.length === 0) {
    throw new InvalidInputError('Input data is empty');
  }

  if (!isHeic(bytes)) {
    throw new InvalidInputError(
      'Input does not appear to be a valid HEIC/HEIF file. Check the file format.',
    );
  }

  return bytes;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AbortError();
  }
}

function extractMetadata(bytes: Uint8Array): { rawExif: Uint8Array | null; metadata: ImageMetadata | undefined } {
  const rawExif = extractExifFromHeic(bytes);
  const xmp = extractXmpFromHeic(bytes);

  if (!rawExif && !xmp) {
    return { rawExif: null, metadata: undefined };
  }

  const metadata: ImageMetadata = {};

  if (rawExif) {
    const parsed = parseExif(rawExif);
    if (parsed) {
      metadata.exif = parsed;
    }
  }

  if (xmp) {
    metadata.xmp = xmp;
  }

  return { rawExif, metadata };
}

function injectMetadata(outputData: Uint8Array, format: OutputFormat, rawExif: Uint8Array | null): Uint8Array {
  if (!rawExif) return outputData;

  switch (format) {
    case 'jpeg':
      return injectExifIntoJpeg(outputData, rawExif);
    case 'png':
      return injectExifIntoPng(outputData, rawExif);
    case 'webp':
      return injectExifIntoWebp(outputData, rawExif);
    default:
      return outputData;
  }
}

export function createConvertFns(encode: EncodeFn) {
  async function convert(options: ConvertOptions): Promise<ConvertResult> {
    const {
      format = 'jpeg',
      quality = 0.92,
      resize,
      preserveMetadata = true,
      imageIndex = 0,
      signal,
    } = options;

    checkAbort(signal);
    const bytes = validateInput(options.data);

    if (imageIndex === 'all') {
      const results = await convertAll({ ...options, format, quality });
      return results[0];
    }

    checkAbort(signal);

    let rawExif: Uint8Array | null = null;
    let metadata: ImageMetadata | undefined;
    if (preserveMetadata) {
      const meta = extractMetadata(bytes);
      rawExif = meta.rawExif;
      metadata = meta.metadata;
    }

    const decoded = await decodeHeif(bytes, imageIndex);
    const image = decoded[0];

    checkAbort(signal);

    let outputData = await encode(
      image.data, image.width, image.height, format, quality, resize,
    );

    if (preserveMetadata && format !== 'raw') {
      outputData = injectMetadata(outputData, format, rawExif);
    }

    return {
      data: outputData, format,
      width: image.width, height: image.height,
      mimeType: getMimeType(format), metadata,
    };
  }

  async function convertAll(
    options: Omit<ConvertOptions, 'imageIndex'>,
  ): Promise<ConvertResult[]> {
    const {
      format = 'jpeg', quality = 0.92, resize,
      preserveMetadata = true, signal,
    } = options;

    checkAbort(signal);
    const bytes = validateInput(options.data);

    let rawExif: Uint8Array | null = null;
    let metadata: ImageMetadata | undefined;
    if (preserveMetadata) {
      const meta = extractMetadata(bytes);
      rawExif = meta.rawExif;
      metadata = meta.metadata;
    }

    const decoded = await decodeHeif(bytes, 'all');
    const results: ConvertResult[] = [];

    for (const image of decoded) {
      checkAbort(signal);

      let outputData = await encode(
        image.data, image.width, image.height, format, quality, resize,
      );

      if (preserveMetadata && format !== 'raw') {
        outputData = injectMetadata(outputData, format, rawExif);
      }

      results.push({
        data: outputData, format,
        width: image.width, height: image.height,
        mimeType: getMimeType(format), metadata,
      });
    }

    return results;
  }

  async function decode(
    data: InputData,
    options?: { imageIndex?: number; signal?: AbortSignal },
  ): Promise<RawPixelResult> {
    checkAbort(options?.signal);
    const bytes = validateInput(data);
    const decoded = await decodeHeif(bytes, options?.imageIndex ?? 0);
    const image = decoded[0];
    const { metadata } = extractMetadata(bytes);

    return {
      data: image.data, width: image.width, height: image.height,
      channels: 4, metadata,
    };
  }

  async function inspect(data: InputData): Promise<ImageInfo> {
    const bytes = validateInput(data);
    const decoded = await decodeHeif(bytes, 'all');
    const { metadata } = extractMetadata(bytes);

    return {
      imageCount: decoded.length, primaryIndex: 0,
      images: decoded.map((img) => ({
        width: img.width, height: img.height, isThumb: false,
      })),
      isSequence: decoded.length > 1, metadata,
    };
  }

  return { convert, convertAll, decode, inspect };
}
