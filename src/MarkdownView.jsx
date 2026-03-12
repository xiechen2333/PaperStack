// 文件: src/MarkdownView.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MarkdownView = ({ content }) => {
  const safeContent = content || '';

  return (
    <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />,
          p: ({...props}) => <p {...props} className="leading-relaxed text-[15px] text-slate-700" />,
          // 分隔线样式我们依然保留在这里，因为这属于组件的基础 UI 设定
          hr: ({...props}) => <hr {...props} className="my-4 border-t border-slate-200/80" />
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
};

export default React.memo(MarkdownView);