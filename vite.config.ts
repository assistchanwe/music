import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages의 하위 경로(/<repo>/)에서도 동작하도록 상대 경로 사용
  base: './',
  plugins: [react()],
});
