import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdf:      ['html2canvas', 'jspdf'],
          firebase: ['firebase/compat/app', 'firebase/compat/firestore', 'firebase/compat/auth'],
        }
      }
    }
  }
})
