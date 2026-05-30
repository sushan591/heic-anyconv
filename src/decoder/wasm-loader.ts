import type { InitOptions } from '../types.js';
import { WasmLoadError } from '../errors.js';
import { isNode } from '../utils/env.js';

interface LibHeifModule {
  HeifDecoder: new () => any;
}

let libheifModule: LibHeifModule | null = null;
let initPromise: Promise<void> | null = null;
let userOptions: InitOptions | undefined;

export async function init(options?: InitOptions): Promise<void> {
  userOptions = options;
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
    if (isNode()) {
      // Node.js: use WASM variant for better performance
      const mod: any = await import('libheif-js/wasm');
      libheifModule = mod.default ?? mod;
    } else {
      // Browser: use wasm-bundle (WASM binary included in JS)
      const mod: any = await import('libheif-js/wasm-bundle');
      libheifModule = mod.default ?? mod;
    }
  } catch {
    try {
      // Fallback: pure JS variant (works everywhere)
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
