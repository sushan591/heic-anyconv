import type { Encoder, EncodeInput } from './encoder.types.js';
import type { OutputFormat } from '../types.js';
import { UnsupportedFormatError } from '../errors.js';

function getMimeForFormat(format: OutputFormat): string {
  switch (format) {
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    default: return '';
  }
}

async function encodeWithOffscreenCanvas(input: EncodeInput): Promise<Uint8Array> {
  const mime = getMimeForFormat(input.format);
  if (!mime) {
    throw new UnsupportedFormatError(input.format, 'canvas');
  }

  let width = input.width;
  let height = input.height;

  // Handle resize
  if (input.resize?.width || input.resize?.height) {
    const targetW = input.resize.width;
    const targetH = input.resize.height;
    const aspect = input.width / input.height;

    if (targetW && targetH) {
      width = targetW;
      height = targetH;
    } else if (targetW) {
      width = targetW;
      height = Math.round(targetW / aspect);
    } else if (targetH) {
      height = targetH;
      width = Math.round(targetH * aspect);
    }
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context from OffscreenCanvas');
  }

  // Create ImageData from source pixels at original size, then draw scaled
  const pixelData = new Uint8ClampedArray(input.pixels.buffer.slice(
    input.pixels.byteOffset,
    input.pixels.byteOffset + input.pixels.byteLength,
  )) as Uint8ClampedArray<ArrayBuffer>;
  const imageData = new ImageData(pixelData, input.width, input.height);

  if (width !== input.width || height !== input.height) {
    const tempCanvas = new OffscreenCanvas(input.width, input.height);
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0, width, height);
  } else {
    ctx.putImageData(imageData, 0, 0);
  }

  const blob = await canvas.convertToBlob({
    type: mime,
    quality: input.format === 'png' ? undefined : input.quality,
  });

  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function encodeWithHTMLCanvas(input: EncodeInput): Promise<Uint8Array> {
  const mime = getMimeForFormat(input.format);
  if (!mime) {
    throw new UnsupportedFormatError(input.format, 'canvas');
  }

  let width = input.width;
  let height = input.height;

  if (input.resize?.width || input.resize?.height) {
    const targetW = input.resize.width;
    const targetH = input.resize.height;
    const aspect = input.width / input.height;

    if (targetW && targetH) {
      width = targetW;
      height = targetH;
    } else if (targetW) {
      width = targetW;
      height = Math.round(targetW / aspect);
    } else if (targetH) {
      height = targetH;
      width = Math.round(targetH * aspect);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context from canvas');
  }

  const pixelData = new Uint8ClampedArray(input.pixels.buffer.slice(
    input.pixels.byteOffset,
    input.pixels.byteOffset + input.pixels.byteLength,
  )) as Uint8ClampedArray<ArrayBuffer>;
  const imageData = new ImageData(pixelData, input.width, input.height);

  if (width !== input.width || height !== input.height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = input.width;
    tempCanvas.height = input.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0, width, height);
  } else {
    ctx.putImageData(imageData, 0, 0);
  }

  const quality = input.format === 'png' ? undefined : input.quality;

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
      quality,
    );
  });
}

export function createCanvasEncoder(): Encoder | null {
  const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
  const hasDOM = typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined';

  if (!hasOffscreen && !hasDOM) {
    return null;
  }

  const encodeFn = hasOffscreen ? encodeWithOffscreenCanvas : encodeWithHTMLCanvas;

  // Detect supported formats
  const supportedFormats: OutputFormat[] = ['png']; // PNG always works

  // Check JPEG and WebP support via canvas
  if (hasOffscreen || hasDOM) {
    supportedFormats.push('jpeg');
    // WebP is supported in all modern browsers
    supportedFormats.push('webp');
  }

  return {
    name: 'canvas',
    supportedFormats,

    supportsFormat(format: OutputFormat) {
      return this.supportedFormats.includes(format);
    },

    async encode(input: EncodeInput): Promise<Uint8Array> {
      if (!this.supportsFormat(input.format)) {
        throw new UnsupportedFormatError(input.format, 'canvas');
      }
      return encodeFn(input);
    },
  };
}
