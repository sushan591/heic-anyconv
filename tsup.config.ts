import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node18',
    dts: true,
    outDir: 'dist/esm',
    external: ['sharp'],
    sourcemap: true,
    clean: true,
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs'],
    platform: 'node',
    target: 'node18',
    dts: true,
    outDir: 'dist/cjs',
    external: ['sharp'],
    sourcemap: true,
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    platform: 'browser',
    target: 'es2020',
    outDir: 'dist/browser',
    sourcemap: true,
    external: ['sharp'],
  },
]);
