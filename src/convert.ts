import type {
  ConvertOptions,
  ConvertResult,
  RawPixelResult,
  ImageInfo,
  ImageMetadata,
  InputData,
} from './types.js';
import { toUint8Array } from './utils/buffer.js';
import { isHeic, getMimeType } from './decoder/format-detect.js';
import { decodeHeif } from './decoder/heif-decoder.js';
import { encodeWithCanvas } from './encoder/canvas-encoder.js';
import { extractExifFromHeic, parseExif } from './metadata/exif-parser.js';
import { extractXmpFromHeic } from './metadata/xmp-parser.js';
import { InvalidInputError, AbortError } from './errors.js';

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

function extractMetadata(bytes: Uint8Array): ImageMetadata | undefined {
  const rawExif = extractExifFromHeic(bytes);
  const xmp = extractXmpFromHeic(bytes);

  if (!rawExif && !xmp) return undefined;

  const metadata: ImageMetadata = {};
  if (rawExif) {
    const parsed = parseExif(rawExif);
    if (parsed) metadata.exif = parsed;
  }
  if (xmp) metadata.xmp = xmp;
  return metadata;
}

export async function convert(options: ConvertOptions): Promise<ConvertResult> {
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

  const metadata = preserveMetadata ? extractMetadata(bytes) : undefined;
  const decoded = await decodeHeif(bytes, imageIndex);
  const image = decoded[0];

  checkAbort(signal);

  const outputData = format === 'raw'
    ? new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength)
    : await encodeWithCanvas(image.data, image.width, image.height, format, quality, resize);

  return {
    data: outputData,
    format,
    width: image.width,
    height: image.height,
    mimeType: getMimeType(format),
    metadata,
  };
}

export async function convertAll(
  options: Omit<ConvertOptions, 'imageIndex'>,
): Promise<ConvertResult[]> {
  const {
    format = 'jpeg',
    quality = 0.92,
    resize,
    preserveMetadata = true,
    signal,
  } = options;

  checkAbort(signal);
  const bytes = validateInput(options.data);
  const metadata = preserveMetadata ? extractMetadata(bytes) : undefined;
  const decoded = await decodeHeif(bytes, 'all');
  const results: ConvertResult[] = [];

  for (const image of decoded) {
    checkAbort(signal);

    const outputData = format === 'raw'
      ? new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength)
      : await encodeWithCanvas(image.data, image.width, image.height, format, quality, resize);

    results.push({
      data: outputData,
      format,
      width: image.width,
      height: image.height,
      mimeType: getMimeType(format),
      metadata,
    });
  }

  return results;
}

export async function decode(
  data: InputData,
  options?: { imageIndex?: number; signal?: AbortSignal },
): Promise<RawPixelResult> {
  checkAbort(options?.signal);
  const bytes = validateInput(data);
  const decoded = await decodeHeif(bytes, options?.imageIndex ?? 0);
  const image = decoded[0];
  const metadata = extractMetadata(bytes);

  return {
    data: image.data,
    width: image.width,
    height: image.height,
    channels: 4,
    metadata,
  };
}

export async function inspect(data: InputData): Promise<ImageInfo> {
  const bytes = validateInput(data);
  const decoded = await decodeHeif(bytes, 'all');
  const metadata = extractMetadata(bytes);

  return {
    imageCount: decoded.length,
    primaryIndex: 0,
    images: decoded.map((img) => ({
      width: img.width,
      height: img.height,
      isThumb: false,
    })),
    isSequence: decoded.length > 1,
    metadata,
  };
}
