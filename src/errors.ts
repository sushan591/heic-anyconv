export class HeicAnyconvError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'HeicAnyconvError';
  }
}

export class InvalidInputError extends HeicAnyconvError {
  constructor(message: string) {
    super(message, 'INVALID_INPUT');
    this.name = 'InvalidInputError';
  }
}

export class UnsupportedFormatError extends HeicAnyconvError {
  constructor(format: string, encoder: string) {
    super(
      `Format "${format}" is not supported by the ${encoder} encoder. Install Sharp for full format support in Node.js.`,
      'UNSUPPORTED_FORMAT',
    );
    this.name = 'UnsupportedFormatError';
  }
}

export class DecoderError extends HeicAnyconvError {
  constructor(message: string) {
    super(message, 'DECODER_ERROR');
    this.name = 'DecoderError';
  }
}

export class WasmLoadError extends HeicAnyconvError {
  constructor(message: string) {
    super(message, 'WASM_LOAD_ERROR');
    this.name = 'WasmLoadError';
  }
}

export class AbortError extends HeicAnyconvError {
  constructor() {
    super('Operation was aborted', 'ABORT');
    this.name = 'AbortError';
  }
}
