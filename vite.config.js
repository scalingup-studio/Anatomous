import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path configuration:
// - By default use '/' (works for CloudFront / root-domain hosting)
// - For GitHub Pages or subfolder hosting, set VITE_BASE_PATH env, e.g. '/Anatomous/'
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  plugins: [react()],
  base,
});

