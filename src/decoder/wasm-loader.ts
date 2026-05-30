import type { InitOptions } from '../types.js';
import { WasmLoadError } from '../errors.js';

interface LibHeifModule {
  HeifDecoder: new () => any;
}

let libheifModule: LibHeifModule | null = null;
let initPromise: Promise<void> | null = null;

export async function init(options?: InitOptions): Promise<void> {
  libheifModule = null;
  initPromise = null;
  await ensureInitialized();
}

export async function ensureInitialized(): Promise<LibHeifModule> {
  if (libheifModule) return libheifModule;

  if (!initPromise) {
    initPromise = loadModule();
  }

  await initPromise;
  return libheifModule!;
}

async function loadModule(): Promise<void> {
  try {
    const mod: any = await import('libheif-js/wasm-bundle');
    libheifModule = mod.default ?? mod;
  } catch (err) {
    throw new WasmLoadError(
      `Failed to load HEIF decoder: ${err instanceof Error ? err.message : String(err)}. ` +
      'Ensure libheif-js is installed.',
    );
  }
}
