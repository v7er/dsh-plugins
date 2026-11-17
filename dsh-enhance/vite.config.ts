import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { name: string }

/**
 * Wrap the CJS bundle in the DSH client-module registration the Web loader expects.
 * The factory receives the loader's `require`, so React stays external.
 */
function dshClientWrapper(): Plugin {
  return {
    name: 'dsh-client-wrapper',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue
        const body = file.code.trimEnd().split('\n').map(line => `    ${line}`).join('\n')
        file.code = [
          'window.__ModuleLoader__.load({',
          `  id: ${JSON.stringify(pkg.name)},`,
          '  factory(require) {',
          '    const module = { exports: {} }',
          '    const exports = module.exports',
          body,
          '    return module.exports',
          '  },',
          '})',
          '',
        ].join('\n')
      }
    },
  }
}

export default defineConfig({
  plugins: [dshClientWrapper()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    target: 'es2022',
    lib: {
      entry: 'src/client.ts',
      formats: ['cjs'],
      fileName: () => 'client.js',
    },
    rollupOptions: {
      external: ['react'],
    },
  },
})
