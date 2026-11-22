import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webNodeModules = path.resolve(__dirname, 'node_modules');

export default defineConfig({
  plugins: [tailwindcss(), react()],
  envDir: path.resolve(__dirname, '..'),
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'zustand'],
    alias: {
      react: path.resolve(webNodeModules, 'react'),
      'react-dom': path.resolve(webNodeModules, 'react-dom'),
      zustand: path.resolve(webNodeModules, 'zustand'),
    },
  },
});
