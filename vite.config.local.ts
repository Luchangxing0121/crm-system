/**
 * 本地部署专用 vite 配置
 * 用法: npx vite build --config vite.config.local.ts
 *
 * 与默认 vite.config.ts 的区别:
 * 1. base: './' — 资源使用相对路径，可直接双击 index.html 打开或部署到任意子目录
 * 2. 使用 HashRouter 的入口文件，file:// 协议下路由仍可工作
 * 3. 不使用飞书平台的 coding-preset，改用原生 vite + react + tailwind
 *    （preset 会注入飞书 SDK、平台变量和 basePath）
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      // 飞书平台能力模块本地部署时置空（本应用不依赖真实 capability）
      'virtual:capabilities': path.resolve(__dirname, 'src/lib/virtual-capabilities-empty.ts'),
    },
  },
  build: {
    outDir: 'dist-local',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.local.html'),
      output: {
        manualChunks: undefined,
      },
    },
  },
});
