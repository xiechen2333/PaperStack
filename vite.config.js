import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/PaperStack/',
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    // 预热常用文件，服务启动后立即编译，减少首次请求白屏时间
    warmup: {
      clientFiles: [
        './src/App.jsx',
        './src/components/MarkdownView.jsx',
        './src/main.jsx',
      ],
    },
  },

  // 【性能核心】预打包所有重量级间接依赖。
  // Vite 在 dev 模式下遇到未预打包的包时会重新触发优化并刷新浏览器，
  // 这正是首次加载白屏长达 30 秒的根本原因。
  optimizeDeps: {
    include: [
      // React 核心
      'react',
      'react-dom',

      // 数据存储
      'localforage',

      // 图标（单包体积最大，必须预打包）
      'lucide-react',

      // ─── Markdown + 数学公式 生态 ───
      'react-markdown',
      'remark-math',
      'rehype-katex',
      'katex',

      // unified 核心
      'unified',

      // remark 子系统
      'remark-parse',
      'remark-rehype',
      'mdast-util-from-markdown',
      'mdast-util-to-markdown',
      'mdast-util-math',
      'mdast-util-to-hast',

      // rehype 子系统（只含node可解析的包）
      'hast-util-to-jsx-runtime',
      'hast-util-from-html',
      'hast-util-is-element',
      'hast-util-from-parse5',
      'hastscript',

      // micromark 核心（GFM 扩展在此版本未单独安装）
      'micromark',
      'micromark-core-commonmark',
      'micromark-extension-math',
      'micromark-factory-destination',
      'micromark-factory-label',
      'micromark-factory-space',
      'micromark-factory-title',
      'micromark-factory-whitespace',
      'micromark-util-character',
      'micromark-util-chunked',
      'micromark-util-classify-character',
      'micromark-util-combine-extensions',
      'micromark-util-decode-numeric-character-reference',
      'micromark-util-decode-string',
      'micromark-util-encode',
      'micromark-util-html-tag-name',
      'micromark-util-normalize-identifier',
      'micromark-util-resolve-all',
      'micromark-util-sanitize-uri',
      'micromark-util-subtokenize',
      'micromark-util-symbol',
      'micromark-util-types',

      // unist 工具层
      'unist-util-visit',
      'unist-util-visit-parents',
      'unist-util-is',
      'unist-util-find-after',
      'unist-util-position',
      'unist-util-remove-position',
      'unist-util-stringify-position',

      // vfile
      'vfile',
      'vfile-location',
      'vfile-message',

      // 其他 unified 工具
      'decode-named-character-reference',
      'character-entities',
      'character-entities-html4',
      'character-entities-legacy',
      'character-reference-invalid',
      'bail',
      'extend',
      'trough',
      'zwitch',
      'trim-lines',
      'is-plain-obj',
      'web-namespaces',
      'property-information',
      'comma-separated-tokens',
      'space-separated-tokens',
    ],
  },
})