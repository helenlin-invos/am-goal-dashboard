import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'build' },
  // expose env vars with REACT_APP_ prefix (keep compatible with existing code)
  envPrefix: 'REACT_APP_',
})
