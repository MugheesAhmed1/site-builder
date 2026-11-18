import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base './' so the built site works from any folder or host. xp-content.js (in public/)
// is copied next to index.html untouched: it holds everything a site owner edits.
export default defineConfig({
  base: './',
  plugins: [react()],
});
