import type { OutputFormat, ResizeOptions } from '../types.js';
import { UnsupportedFormatError } from '../errors.js';

function getMimeForFormat(format: OutputFormat): string {
  switch (format) {
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    default: return '';
  }
}

export async function encodeWithCanvas(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  format: OutputFormat,
  quality: number,
  resize?: ResizeOptions,
): Promise<Uint8Array> {
  const mime = getMimeForFormat(format);
  if (!mime) {
    throw new UnsupportedFormatError(format, 'canvas');
  }

  let width = srcWidth;
  let height = srcHeight;

  if (resize?.width || resize?.height) {
    const aspect = srcWidth / srcHeight;
    if (resize.width && resize.height) {
      width = resize.width;
      height = resize.height;
    } else if (resize.width) {
      width = resize.width;
      height = Math.round(resize.width / aspect);
    } else if (resize.height) {
      height = resize.height;
      width = Math.round(resize.height * aspect);
    }
  }

  const pixelData = new Uint8ClampedArray(pixels.buffer.slice(
    pixels.byteOffset,
    pixels.byteOffset + pixels.byteLength,
  )) as Uint8ClampedArray<ArrayBuffer>;
  const imageData = new ImageData(pixelData, srcWidth, srcHeight);

  if (typeof OffscreenCanvas !== 'undefined') {
    return encodeOffscreen(imageData, srcWidth, srcHeight, width, height, mime, format, quality);
  }

  if (typeof document !== 'undefined') {
    return encodeDOM(imageData, srcWidth, srcHeight, width, height, mime, format, quality);
  }

  throw new Error('No Canvas API available. This package requires a browser environment.');
}

async function encodeOffscreen(
  imageData: ImageData,
  srcWidth: number,
  srcHeight: number,
  width: number,
  height: number,
  mime: string,
  format: OutputFormat,
  quality: number,
): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;

  if (width !== srcWidth || height !== srcHeight) {
    const tmp = new OffscreenCanvas(srcWidth, srcHeight);
    tmp.getContext('2d')!.putImageData(imageData, 0, 0);
    ctx.drawImage(tmp, 0, 0, width, height);
  } else {
    ctx.putImageData(imageData, 0, 0);
  }

  const blob = await canvas.convertToBlob({
    type: mime,
    quality: format === 'png' ? undefined : quality,
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function encodeDOM(
  imageData: ImageData,
  srcWidth: number,
  srcHeight: number,
  width: number,
  height: number,
  mime: string,
  format: OutputFormat,
  quality: number,
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (width !== srcWidth || height !== srcHeight) {
    const tmp = document.createElement('canvas');
    tmp.width = srcWidth;
    tmp.height = srcHeight;
    tmp.getContext('2d')!.putImageData(imageData, 0, 0);
    ctx.drawImage(tmp, 0, 0, width, height);
  } else {
    ctx.putImageData(imageData, 0, 0);
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        blob.arrayBuffer().then(
          (ab) => resolve(new Uint8Array(ab)),
          reject,
        );
      },
      mime,
      format === 'png' ? undefined : quality,
    );
  });
}
