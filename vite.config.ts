import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages project sites are served from /<repo-name>/
  // Set base to match the repository name for production builds
  base: process.env.NODE_ENV === 'production' ? '/Harmony-Playground/' : '/',
  plugins: [react()],
  server: { port: 5173 }
})
