import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' pour que les chemins d'assets fonctionnent quel que soit
// le sous-chemin GitHub Pages (ex: /opj-planning/).
export default defineConfig({
  base: './',
  plugins: [vue()],
})
