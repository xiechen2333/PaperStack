import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  server: {
    host: '0.0.0.0', 
    port: 5173,
    // 预热常用文件，保留这个性能优化
    warmup: {
      clientFiles: ['./src/App.jsx', './src/MarkdownView.jsx'],
    },
    // 【新增核心修复】：允许 Vite 跨目录读取上一级的 node_modules，彻底解决 KaTeX 字体 404 拦截问题
    fs: {
      allow: ['..'],
    },
  },

  // 【核心修复】：必须把 markdown 系列包加到这里，否则开发模式会白屏
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'lucide-react', 
      'localforage', 
      'react-markdown', 
      'rehype-katex', 
      'remark-math', 
      'katex' 
    ],
  },
})