import { describe, it, expect } from 'vitest';
import {
  HeicAnyconvError,
  InvalidInputError,
  UnsupportedFormatError,
  DecoderError,
  WasmLoadError,
  AbortError,
} from '../../src/errors.js';

describe('errors', () => {
  it('InvalidInputError has correct properties', () => {
    const err = new InvalidInputError('bad data');
    expect(err).toBeInstanceOf(HeicAnyconvError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('INVALID_INPUT');
    expect(err.name).toBe('InvalidInputError');
    expect(err.message).toBe('bad data');
  });

  it('UnsupportedFormatError includes encoder name', () => {
    const err = new UnsupportedFormatError('avif', 'canvas');
    expect(err.code).toBe('UNSUPPORTED_FORMAT');
    expect(err.message).toContain('avif');
    expect(err.message).toContain('canvas');
  });

  it('DecoderError has correct code', () => {
    const err = new DecoderError('decode failed');
    expect(err.code).toBe('DECODER_ERROR');
  });

  it('WasmLoadError has correct code', () => {
    const err = new WasmLoadError('wasm missing');
    expect(err.code).toBe('WASM_LOAD_ERROR');
  });

  it('AbortError has correct properties', () => {
    const err = new AbortError();
    expect(err.code).toBe('ABORT');
    expect(err.message).toBe('Operation was aborted');
  });
});
