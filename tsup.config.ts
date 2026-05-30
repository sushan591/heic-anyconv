import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  platform: 'browser',
  target: 'es2020',
  dts: true,
  outDir: 'dist',
  sourcemap: true,
  clean: true,
});
