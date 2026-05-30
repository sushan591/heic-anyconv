import type {
  ConvertOptions,
  ConvertResult,
  RawPixelResult,
  ImageInfo,
  InputData,
  OutputFormat,
} from './types.js';
import { toUint8Array } from './utils/buffer.js';
import { isHeic, getMimeType } from './decoder/format-detect.js';
import { decodeHeif, getImageCount } from './decoder/heif-decoder.js';
import { encode } from './encoder/index.js';
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

export async function convert(options: ConvertOptions): Promise<ConvertResult> {
  const {
    format = 'jpeg',
    quality = 0.92,
    resize,
    imageIndex = 0,
    signal,
  } = options;

  checkAbort(signal);

  const bytes = validateInput(options.data);

  // If requesting all images, delegate to convertAll internally
  if (imageIndex === 'all') {
    const results = await convertAll({ ...options, format, quality });
    return results[0];
  }

  checkAbort(signal);

  // Decode
  const decoded = await decodeHeif(bytes, imageIndex);
  const image = decoded[0];

  checkAbort(signal);

  // Encode
  const outputData = await encode(
    image.data,
    image.width,
    image.height,
    format,
    quality,
    resize,
  );

  return {
    data: outputData,
    format,
    width: image.width,
    height: image.height,
    mimeType: getMimeType(format),
  };
}

export async function convertAll(
  options: Omit<ConvertOptions, 'imageIndex'>,
): Promise<ConvertResult[]> {
  const {
    format = 'jpeg',
    quality = 0.92,
    resize,
    signal,
  } = options;

  checkAbort(signal);

  const bytes = validateInput(options.data);
  const decoded = await decodeHeif(bytes, 'all');

  const results: ConvertResult[] = [];

  for (const image of decoded) {
    checkAbort(signal);

    const outputData = await encode(
      image.data,
      image.width,
      image.height,
      format,
      quality,
      resize,
    );

    results.push({
      data: outputData,
      format,
      width: image.width,
      height: image.height,
      mimeType: getMimeType(format),
    });
  }

  return results;
}

export async function decode(
  data: InputData,
  options?: { imageIndex?: number; signal?: AbortSignal },
): Promise<RawPixelResult> {
  const signal = options?.signal;
  checkAbort(signal);

  const bytes = validateInput(data);
  const decoded = await decodeHeif(bytes, options?.imageIndex ?? 0);
  const image = decoded[0];

  return {
    data: image.data,
    width: image.width,
    height: image.height,
    channels: 4,
  };
}

export async function inspect(data: InputData): Promise<ImageInfo> {
  const bytes = validateInput(data);

  // Decode all images to get their dimensions
  // TODO: In a future version, parse ISOBMFF boxes directly to avoid full decode
  const decoded = await decodeHeif(bytes, 'all');

  return {
    imageCount: decoded.length,
    primaryIndex: 0,
    images: decoded.map((img) => ({
      width: img.width,
      height: img.height,
      isThumb: false,
    })),
    isSequence: decoded.length > 1,
  };
}
