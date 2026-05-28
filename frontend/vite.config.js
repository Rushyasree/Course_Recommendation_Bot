import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          charts: ["chart.js", "react-chartjs-2"],
          ui: ["framer-motion", "lucide-react", "react-markdown"],
        },
      },
    },
  }
});
