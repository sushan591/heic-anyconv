import { DecoderError } from '../errors.js';
import { ensureInitialized } from './wasm-loader.js';

export interface DecodedImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(
    imageData: { data: Uint8ClampedArray; width: number; height: number },
    callback: (result: { data: Uint8ClampedArray; width: number; height: number } | null) => void,
  ): void;
}

export async function decodeHeif(
  input: Uint8Array,
  imageIndex?: number | 'all',
): Promise<DecodedImage[]> {
  const libheif = await ensureInitialized();
  const decoder = new libheif.HeifDecoder();

  let images: HeifImage[];
  try {
    images = decoder.decode(input);
  } catch (err) {
    throw new DecoderError(
      `Failed to decode HEIC data: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!images || images.length === 0) {
    throw new DecoderError('No images found in HEIC file');
  }

  let selectedImages: HeifImage[];
  if (imageIndex === 'all') {
    selectedImages = images;
  } else {
    const idx = imageIndex ?? 0;
    if (idx < 0 || idx >= images.length) {
      throw new DecoderError(
        `Image index ${idx} out of range. File contains ${images.length} image(s).`,
      );
    }
    selectedImages = [images[idx]];
  }

  const results: DecodedImage[] = [];

  for (const image of selectedImages) {
    const width = image.get_width();
    const height = image.get_height();
    const pixelData = new Uint8ClampedArray(width * height * 4);

    const decoded = await new Promise<DecodedImage>((resolve, reject) => {
      image.display({ data: pixelData, width, height }, (displayData) => {
        if (!displayData) {
          reject(new DecoderError('HEIF processing error: display returned null'));
          return;
        }
        resolve({
          width: displayData.width,
          height: displayData.height,
          data: displayData.data,
        });
      });
    });

    results.push(decoded);
  }

  return results;
}
