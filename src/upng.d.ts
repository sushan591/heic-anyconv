declare module 'upng-js' {
  interface UPNG {
    encode(
      imgs: ArrayBuffer[],
      w: number,
      h: number,
      cnum: number,
      dels?: number[],
    ): ArrayBuffer;
    encodeLL(
      imgs: ArrayBuffer[],
      w: number,
      h: number,
      cc: number,
      ac: number,
      depth: number,
      dels?: number[],
    ): ArrayBuffer;
  }

  const upng: UPNG;
  export = upng;
}
