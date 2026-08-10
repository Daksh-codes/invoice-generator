import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf-8')
)
const apiUrl = `http://localhost:${config.port}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  server: {
    proxy: {
      '/api': apiUrl,
      '/images': apiUrl,
    }
  }
})
