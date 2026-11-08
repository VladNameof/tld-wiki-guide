import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_']);

  return {
    base: env.VITE_BASE_PATH || './',
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'map-vendor': ['leaflet'],
          },
        },
      },
    },
    server: {
      port: 5173,
      warmup: {
        clientFiles: ['./src/main.tsx', './src/l5-ui/App.tsx'],
      },
    },
  };
});
