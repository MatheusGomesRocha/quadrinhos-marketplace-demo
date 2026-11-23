import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `--mode demo` gera a versão sem backend (tudo roda no navegador). O `base` relativo permite hospedar em qualquer subpasta (GitHub Pages).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, proxy: { '/api': 'http://localhost:3333' } },
});
