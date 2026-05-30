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
    // Browser: use wasm-bundle (WASM binary inlined in JS, no fs needed)
    const mod: any = await import('libheif-js/wasm-bundle');
    libheifModule = mod.default ?? mod;
  } catch {
    try {
      // Fallback: pure JS variant
      const mod: any = await import('libheif-js');
      libheifModule = mod.default ?? mod;
    } catch (err) {
      throw new WasmLoadError(
        `Failed to load HEIF decoder: ${err instanceof Error ? err.message : String(err)}. ` +
        'Ensure libheif-js is installed.',
      );
    }
  }
}

export function getModule(): LibHeifModule | null {
  return libheifModule;
}
