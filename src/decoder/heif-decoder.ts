import { DecoderError } from '../errors.js';

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

interface HeifDecoder {
  decode(data: Uint8Array | Buffer): HeifImage[];
}

interface LibHeif {
  HeifDecoder: new () => HeifDecoder;
}

let libheifModule: LibHeif | null = null;

async function getLibHeif(): Promise<LibHeif> {
  if (libheifModule) return libheifModule;

  try {
    // Use the WASM variant for Node.js (better performance)
    const mod: any = await import('libheif-js/wasm');
    libheifModule = mod.default ?? mod;
    return libheifModule!;
  } catch {
    try {
      // Fallback to default (pure JS)
      const mod: any = await import('libheif-js');
      libheifModule = mod.default ?? mod;
      return libheifModule!;
    } catch (err) {
      throw new DecoderError(
        `Failed to load libheif: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

export async function decodeHeif(
  input: Uint8Array,
  imageIndex?: number | 'all',
): Promise<DecodedImage[]> {
  const libheif = await getLibHeif();
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

  // Determine which images to decode
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

export async function getImageCount(input: Uint8Array): Promise<number> {
  const libheif = await getLibHeif();
  const decoder = new libheif.HeifDecoder();

  try {
    const images = decoder.decode(input);
    return images?.length ?? 0;
  } catch {
    return 0;
  }
}
