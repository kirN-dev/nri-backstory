/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ВАЖНО: base должен совпадать с именем репозитория,
// иначе на GitHub Pages не загрузятся стили и скрипты.
export default defineConfig({
  base: '/nri-backstory/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
