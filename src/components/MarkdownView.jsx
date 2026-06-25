// 文件: src/MarkdownView.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const getDomProps = (props) => {
  const domProps = {...props};
  delete domProps.node;
  return domProps;
};

const MarkdownView = ({ content }) => {
  const safeContent = content || '';

  return (
    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: (props) => <a {...getDomProps(props)} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline" />,
          p: (props) => <p {...getDomProps(props)} className="leading-relaxed text-[15px] text-slate-700 dark:text-slate-300" />,
          table: (props) => (
            <div className="my-3 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
              <table {...getDomProps(props)} className="my-0 w-full min-w-max border-collapse text-left text-[14px]" />
            </div>
          ),
          th: (props) => <th {...getDomProps(props)} className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" />,
          td: (props) => <td {...getDomProps(props)} className="border-t border-slate-100 px-3 py-2 align-top text-slate-700 dark:border-slate-800 dark:text-slate-300" />,
          // 分隔线样式我们依然保留在这里，因为这属于组件的基础 UI 设定
          hr: (props) => <hr {...getDomProps(props)} className="my-4 border-t border-slate-200/80 dark:border-slate-800" />
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
};

export default React.memo(MarkdownView);
