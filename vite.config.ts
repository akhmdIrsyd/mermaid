import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['mermaid', '@mermaid-js/layout-elk', 'pako', 'jspdf'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
