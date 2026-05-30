# heic-anyconv

Universal HEIC/HEIF to any format converter for Node.js and browsers.

Convert iPhone photos (HEIC) to JPEG, PNG, WebP, AVIF, TIFF, or raw pixel data. Supports multi-image HEIC files (Live Photos, bursts) and preserves EXIF metadata.

## Install

```bash
npm install heic-anyconv
```

All dependencies (including Sharp for high-quality encoding) are included automatically.

## Quick Start

```typescript
import { convert } from 'heic-anyconv';
import { readFile, writeFile } from 'node:fs/promises';

const heic = await readFile('photo.heic');
const { data } = await convert({ data: heic, format: 'jpeg' });
await writeFile('photo.jpg', data);
```

## API

### `convert(options): Promise<ConvertResult>`

Convert a HEIC/HEIF image to any supported format.

```typescript
const result = await convert({
  data: heicBuffer,       // Uint8Array | ArrayBuffer | Buffer
  format: 'jpeg',         // 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff' | 'raw'
  quality: 0.92,          // 0-1 for lossy formats (default: 0.92)
  resize: { width: 800 }, // optional resize
  preserveMetadata: true, // preserve EXIF/XMP (default: true)
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
const frames = await convertAll({
  data: heicBuffer,
  format: 'png',
});
// frames[0], frames[1], ... one per image in the container
```

### `decode(data, options?): Promise<RawPixelResult>`

Decode to raw RGBA pixel data for custom processing.

```typescript
const { data, width, height, channels } = await decode(heicBuffer);
// data is Uint8ClampedArray of RGBA pixels
// channels is always 4
```

### `inspect(data): Promise<ImageInfo>`

Get image information without full pixel decoding.

```typescript
const info = await inspect(heicBuffer);
// info.imageCount  - number of images
// info.primaryIndex - index of primary image
// info.images      - array of { width, height, isThumb }
// info.isSequence  - true if multi-image
// info.metadata    - EXIF/XMP metadata
```

### `isHeic(data): boolean`

Fast format detection by checking ISOBMFF magic bytes. No WASM needed.

```typescript
if (isHeic(buffer)) {
  const result = await convert({ data: buffer, format: 'jpeg' });
}
```

### `init(options?): Promise<void>`

Pre-initialize the WASM decoder. Called automatically on first use.

```typescript
// Custom WASM path (browser)
await init({ wasmPath: '/assets/libheif.wasm' });

// Pre-compiled module (Cloudflare Workers)
await init({ wasmModule: compiledModule });
```

## Browser Usage

```html
<input type="file" accept=".heic,.heif" id="input" />
<img id="preview" />

<script type="module">
  import { convert, isHeic } from 'heic-anyconv';

  document.getElementById('input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const buffer = new Uint8Array(await file.arrayBuffer());

    if (!isHeic(buffer)) return;

    const { data, mimeType } = await convert({
      data: buffer,
      format: 'jpeg',
      quality: 0.85,
    });

    const blob = new Blob([data], { type: mimeType });
    document.getElementById('preview').src = URL.createObjectURL(blob);
  });
</script>
```

## Output Formats

| Format | Node.js | Browser | Notes |
|--------|---------|---------|-------|
| JPEG   | Sharp   | Canvas  | Best compatibility |
| PNG    | Sharp   | Canvas  | Lossless, larger files |
| WebP   | Sharp   | Canvas  | Good compression |
| AVIF   | Sharp   | -       | Best compression |
| TIFF   | Sharp   | -       | Professional workflows |
| raw    | Built-in| Built-in| RGBA pixel data |

## Supported Input Formats

All HEIC/HEIF variants from iPhones and other devices:

- `heic` - Single HEIC image (iPhone default)
- `heix` - Extended HEIC
- `hevc` / `hevx` - HEVC-based HEIF
- `mif1` - HEIF image
- `msf1` - HEIF sequence (Live Photos, bursts)

## Error Handling

```typescript
import { convert, InvalidInputError, UnsupportedFormatError } from 'heic-anyconv';

try {
  const result = await convert({ data: buffer, format: 'jpeg' });
} catch (err) {
  if (err instanceof InvalidInputError) {
    // Not a valid HEIC file
  } else if (err instanceof UnsupportedFormatError) {
    // Format not supported by current encoder
  }
}
```

## License

MIT
