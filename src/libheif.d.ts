declare module 'libheif-js' {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(
      imageData: { data: Uint8ClampedArray; width: number; height: number },
      callback: (result: { data: Uint8ClampedArray; width: number; height: number } | null) => void,
    ): void;
  }

  interface HeifDecoderInstance {
    decode(data: Uint8Array | Buffer): HeifImage[];
  }

  interface LibHeif {
    HeifDecoder: new () => HeifDecoderInstance;
  }

  const libheif: LibHeif;
  export default libheif;
}

declare module 'libheif-js/wasm' {
  import type libheif from 'libheif-js';
  export default libheif;
}

declare module 'libheif-js/wasm-bundle' {
  import type libheif from 'libheif-js';
  export default libheif;
}
