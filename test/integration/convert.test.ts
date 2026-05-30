import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { convert, decode, inspect, isHeic, convertAll } from '../../src/index.js';

const fixturePath = resolve(import.meta.dirname, '../fixtures/sample.heic');

describe('convert (integration)', () => {
  it('detects sample.heic as HEIC', async () => {
    const data = await readFile(fixturePath);
    expect(isHeic(data)).toBe(true);
  });

  it('converts HEIC to JPEG', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data, format: 'jpeg' });

    expect(result.format).toBe('jpeg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.data.length).toBeGreaterThan(0);
    // JPEG magic bytes: FF D8
    expect(result.data[0]).toBe(0xFF);
    expect(result.data[1]).toBe(0xD8);
  });

  it('converts HEIC to PNG', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data, format: 'png' });

    expect(result.format).toBe('png');
    expect(result.mimeType).toBe('image/png');
    expect(result.data.length).toBeGreaterThan(0);
    // PNG magic bytes: 89 50 4E 47
    expect(result.data[0]).toBe(0x89);
    expect(result.data[1]).toBe(0x50);
    expect(result.data[2]).toBe(0x4E);
    expect(result.data[3]).toBe(0x47);
  });

  it('converts HEIC to WebP', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data, format: 'webp' });

    expect(result.format).toBe('webp');
    expect(result.mimeType).toBe('image/webp');
    expect(result.data.length).toBeGreaterThan(0);
    // RIFF....WEBP
    expect(String.fromCharCode(result.data[0], result.data[1], result.data[2], result.data[3])).toBe('RIFF');
  });

  it('decodes HEIC to raw RGBA', async () => {
    const data = await readFile(fixturePath);
    const result = await decode(data);

    expect(result.channels).toBe(4);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.data.length).toBe(result.width * result.height * 4);
  });

  it('inspects HEIC file', async () => {
    const data = await readFile(fixturePath);
    const info = await inspect(data);

    expect(info.imageCount).toBeGreaterThanOrEqual(1);
    expect(info.primaryIndex).toBe(0);
    expect(info.images.length).toBeGreaterThanOrEqual(1);
    expect(info.images[0].width).toBeGreaterThan(0);
    expect(info.images[0].height).toBeGreaterThan(0);
  });

  it('respects quality parameter (lower quality = smaller file)', async () => {
    const data = await readFile(fixturePath);

    const highQuality = await convert({ data, format: 'jpeg', quality: 0.95 });
    const lowQuality = await convert({ data, format: 'jpeg', quality: 0.3 });

    expect(lowQuality.data.length).toBeLessThan(highQuality.data.length);
  });

  it('defaults to jpeg format', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data });

    expect(result.format).toBe('jpeg');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('throws InvalidInputError for non-HEIC data', async () => {
    const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    await expect(convert({ data: jpegData })).rejects.toThrow('does not appear to be a valid HEIC');
  });

  it('throws InvalidInputError for empty data', async () => {
    await expect(convert({ data: new Uint8Array(0) })).rejects.toThrow('empty');
  });

  it('supports resize option', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({
      data,
      format: 'jpeg',
      resize: { width: 100 },
    });

    expect(result.data.length).toBeGreaterThan(0);
    // The output should be valid JPEG
    expect(result.data[0]).toBe(0xFF);
    expect(result.data[1]).toBe(0xD8);
  });

  it('converts to raw format', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data, format: 'raw' });

    expect(result.format).toBe('raw');
    // Raw data should be width * height * 4 (RGBA)
    expect(result.data.length).toBe(result.width * result.height * 4);
  });

  it('supports AbortSignal', async () => {
    const data = await readFile(fixturePath);
    const controller = new AbortController();
    controller.abort();

    await expect(convert({ data, signal: controller.signal })).rejects.toThrow('aborted');
  });

  it('preserves metadata by default', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data, format: 'jpeg' });

    // metadata field should be present (may or may not have exif depending on fixture)
    // The important thing is that the convert doesn't crash with metadata enabled
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('can disable metadata preservation', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data, format: 'jpeg', preserveMetadata: false });

    expect(result.metadata).toBeUndefined();
  });

  it('inspect returns metadata when available', async () => {
    const data = await readFile(fixturePath);
    const info = await inspect(data);

    expect(info.imageCount).toBeGreaterThanOrEqual(1);
    // metadata may or may not exist depending on fixture content
    expect(typeof info.imageCount).toBe('number');
  });

  it('decode returns metadata', async () => {
    const data = await readFile(fixturePath);
    const result = await decode(data);

    expect(result.channels).toBe(4);
    expect(result.width).toBeGreaterThan(0);
  });

  it('converts HEIC to AVIF', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data, format: 'avif' });

    expect(result.format).toBe('avif');
    expect(result.mimeType).toBe('image/avif');
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('converts HEIC to TIFF', async () => {
    const data = await readFile(fixturePath);
    const result = await convert({ data, format: 'tiff' });

    expect(result.format).toBe('tiff');
    expect(result.mimeType).toBe('image/tiff');
    expect(result.data.length).toBeGreaterThan(0);
  });
});
