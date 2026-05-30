import { describe, it, expect } from 'vitest';
import { toUint8Array } from '../../src/utils/buffer.js';

describe('toUint8Array', () => {
  it('returns Uint8Array as-is', () => {
    const input = new Uint8Array([1, 2, 3]);
    expect(toUint8Array(input)).toBe(input);
  });

  it('converts ArrayBuffer', () => {
    const ab = new ArrayBuffer(3);
    const view = new Uint8Array(ab);
    view[0] = 10; view[1] = 20; view[2] = 30;
    const result = toUint8Array(ab);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(10);
    expect(result.length).toBe(3);
  });

  it('handles Buffer (Node.js)', () => {
    const buf = Buffer.from([4, 5, 6]);
    const result = toUint8Array(buf);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(4);
    expect(result.length).toBe(3);
  });

  it('throws on invalid input', () => {
    expect(() => toUint8Array('string' as any)).toThrow(TypeError);
    expect(() => toUint8Array(123 as any)).toThrow(TypeError);
  });
});
