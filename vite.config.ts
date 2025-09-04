import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import { defineEnv } from "unenv";
import inject from '@rollup/plugin-inject';
import basicSsl from '@vitejs/plugin-basic-ssl'

const { env } = defineEnv({
  nodeCompat: true,
  npmShims: true,
  resolve: true,
  presets: [],
  overrides: {
    'alias': {
      'fs': '@zenfs/core',
      'node:fs': '@zenfs/core'
      // path is already aliased to pathe by unenv.
    }
  },
});

export default defineConfig({
  plugins: [
    UnoCSS(),
    inject(env.inject),
    basicSsl(),
  ],
  resolve: {
    alias: {
      ...env.alias
    },
  },
  ssr: {
    external: [...env.external],
  },
  optimizeDeps: {
    exclude: ['@rollup/browser']
  },
})