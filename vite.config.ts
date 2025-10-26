import { defineConfig } from 'vite';
import webExtension from '@samrum/vite-plugin-web-extension';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Determine target platform from mode or environment
function getTargetFromMode(mode: string): 'firefox' | 'chrome' {
  return mode === 'firefox' ? 'firefox' : 'chrome';
}

export default defineConfig(({ mode }) => {
  const target = getTargetFromMode(mode);
  const manifestPath = resolve(__dirname, `src/${target}/manifest.json`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<
    string,
    unknown
  >;

  return {
    plugins: [
      tsconfigPaths(),
      webExtension({
        manifest,
        useDynamicUrlWebAccessibleResources: false,
        additionalInputs: {
          html: [
            `src/${target}/scripts/browse.html`,
            `src/${target}/scripts/options.html`,
          ],
          scripts: [`src/${target}/scripts/content.ts`],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: `dist/${target}`,
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
      },
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/tests/setup.ts'],
      include: ['src/tests/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'dist/',
          'src/tests/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/mockData',
        ],
      },
    },
  };
});
