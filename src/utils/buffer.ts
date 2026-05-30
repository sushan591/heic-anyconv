import type { InputData } from '../types.js';

export function toUint8Array(input: InputData): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  throw new TypeError('Input must be a Uint8Array or ArrayBuffer');
}
