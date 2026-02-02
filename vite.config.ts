import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Use relative paths for production builds so the site can be served from GitHub Pages (project pages).
  // Keep a normal root during development so the dev server routing behaves as expected.
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  plugins: [react()],
  server: { port: 5173 }
})
