import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decode, inspect, isHeic } from '../../src/index.js';

const fixturePath = resolve(import.meta.dirname, '../fixtures/sample.heic');

describe('isHeic', () => {
  it('detects sample.heic as HEIC', async () => {
    const data = await readFile(fixturePath);
    expect(isHeic(data)).toBe(true);
  });

  it('returns false for non-HEIC data', () => {
    const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(isHeic(jpegData)).toBe(false);
  });
});

describe('decode', () => {
  it('decodes HEIC to raw RGBA', async () => {
    const data = await readFile(fixturePath);
    const result = await decode(data);

    expect(result.channels).toBe(4);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.data.length).toBe(result.width * result.height * 4);
  });

  it('returns metadata when available', async () => {
    const data = await readFile(fixturePath);
    const result = await decode(data);

    expect(result.channels).toBe(4);
    expect(result.width).toBeGreaterThan(0);
  });

  it('throws for empty data', async () => {
    await expect(decode(new Uint8Array(0))).rejects.toThrow('empty');
  });

  it('throws for non-HEIC data', async () => {
    const jpegData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    await expect(decode(jpegData)).rejects.toThrow('does not appear to be a valid HEIC');
  });

  it('supports AbortSignal', async () => {
    const data = await readFile(fixturePath);
    const controller = new AbortController();
    controller.abort();

    await expect(decode(data, { signal: controller.signal })).rejects.toThrow('aborted');
  });
});

describe('inspect', () => {
  it('inspects HEIC file', async () => {
    const data = await readFile(fixturePath);
    const info = await inspect(data);

    expect(info.imageCount).toBeGreaterThanOrEqual(1);
    expect(info.primaryIndex).toBe(0);
    expect(info.images.length).toBeGreaterThanOrEqual(1);
    expect(info.images[0].width).toBeGreaterThan(0);
    expect(info.images[0].height).toBeGreaterThan(0);
    expect(typeof info.imageCount).toBe('number');
  });
});
