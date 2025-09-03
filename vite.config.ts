import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import { defineEnv } from "unenv";
import inject from '@rollup/plugin-inject';

const { env } = defineEnv({
  nodeCompat: true,
  npmShims: true,
  resolve: true,
  presets: [],
  overrides: {},
});

export default defineConfig({
  plugins: [
    UnoCSS(),
    inject(env.inject),
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
    exclude: ['@rollup/browser', '@oxc-transform/binding-wasm32-wasi']
  },
})