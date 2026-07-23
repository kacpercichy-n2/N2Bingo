import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// GitHub Pages serves a project site from /<repo>/, so the base has to match.
// Set VITE_BASE=/ for a custom domain or a user/organisation page.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/N2Bingo/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
