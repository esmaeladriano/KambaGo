import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom', 'zustand'],
      alias: {
        '@': rootDir,
        react: path.resolve(import.meta.dirname, 'node_modules/react'),
        'react-dom': path.resolve(import.meta.dirname, 'node_modules/react-dom'),
        zustand: path.resolve(import.meta.dirname, 'node_modules/zustand'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      fs: {
        allow: [rootDir],
      },
    },
  };
});
