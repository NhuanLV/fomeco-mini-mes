import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import ui from '@nuxt/ui/vite'

// base './' để build chạy được trên GitHub Pages / Netlify / thư mục con
export default defineConfig({
  root: 'webapp',
  base: './',
  envDir: fileURLToPath(new URL('./', import.meta.url)),
  plugins: [
    vue(),
    ui({
      colorMode: false,
      ui: {
        colors: { primary: 'emerald' },
        badge: { defaultVariants: { variant: 'soft' } },
        alert: { defaultVariants: { variant: 'subtle' } },
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./webapp/src', import.meta.url)) },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
})
