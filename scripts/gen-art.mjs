import { build } from 'esbuild';
await build({ entryPoints: ['scripts/art/gen.tsx'], bundle: true, platform: 'node', format: 'esm', outfile: 'scripts/art/.gen.mjs', jsx: 'automatic', logLevel: 'error', banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" } });
await import('./art/.gen.mjs');
