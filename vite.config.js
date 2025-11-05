import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use base only in production (GH Pages). In dev, base should be '/'
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/Anatomous/' : '/',
});

