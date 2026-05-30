# heic-anyconv

Browser HEIC/HEIF to JPEG, PNG, or WebP converter.

Convert iPhone photos (HEIC) to standard image formats using Canvas API. Single dependency (`libheif-js`), no Node.js required.

## Install

```bash
npm install heic-anyconv
```

## Quick Start

```typescript
import { convert, isHeic } from 'heic-anyconv';

const file = input.files[0];
const buffer = new Uint8Array(await file.arrayBuffer());

if (isHeic(buffer)) {
  const { data, mimeType } = await convert({ data: buffer, format: 'jpeg' });
  const blob = new Blob([data], { type: mimeType });
  img.src = URL.createObjectURL(blob);
}
```

## API

### `convert(options): Promise<ConvertResult>`

Convert a HEIC/HEIF image to JPEG, PNG, WebP, or raw RGBA.

```typescript
const result = await convert({
  data: heicBuffer,       // Uint8Array | ArrayBuffer
  format: 'jpeg',         // 'jpeg' | 'png' | 'webp' | 'raw'
  quality: 0.92,          // 0-1 for lossy formats (default: 0.92)
  resize: { width: 800 }, // optional resize
  preserveMetadata: true, // extract EXIF/XMP (default: true)
  imageIndex: 0,          // which image in multi-image file (default: 0)
  signal: controller.signal, // AbortSignal for cancellation
});

// result.data     - Uint8Array of encoded image
// result.format   - output format used
// result.width    - output width in pixels
// result.height   - output height in pixels
// result.mimeType - e.g. 'image/jpeg'
// result.metadata - extracted EXIF/XMP if preserveMetadata is true
```

### `convertAll(options): Promise<ConvertResult[]>`

Convert all images in a multi-image HEIC file (Live Photos, burst shots).

```typescript
const frames = await convertAll({ data: heicBuffer, format: 'png' });
```

### `decode(data, options?): Promise<RawPixelResult>`

Decode to raw RGBA pixel data for custom processing.

```typescript
const { data, width, height, channels } = await decode(heicBuffer);
// data is Uint8ClampedArray of RGBA pixels, channels is always 4
```

### `inspect(data): Promise<ImageInfo>`

Get image information without encoding.

```typescript
const info = await inspect(heicBuffer);
// info.imageCount, info.images[].width/height, info.isSequence, info.metadata
```

### `isHeic(data): boolean`

Fast format detection by checking ISOBMFF magic bytes. No WASM needed.

### `init(options?): Promise<void>`

Pre-initialize the WASM decoder. Called automatically on first use.

## Output Formats

| Format | Encoding | Notes |
|--------|----------|-------|
| JPEG   | Canvas   | Best compatibility |
| PNG    | Canvas   | Lossless |
| WebP   | Canvas   | Good compression |
| raw    | Built-in | RGBA pixel data |

## Error Handling

```typescript
import { convert, InvalidInputError, UnsupportedFormatError } from 'heic-anyconv';

try {
  const result = await convert({ data: buffer, format: 'jpeg' });
} catch (err) {
  if (err instanceof InvalidInputError) {
    // Not a valid HEIC file
  }
}
```

## License

MIT
