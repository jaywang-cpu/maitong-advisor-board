"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-[#4acf85] mb-3 mt-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold text-[#4acf85] mb-2 mt-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold text-[#c9a84c] mb-2 mt-3">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-gray-200 mb-3 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-5 mb-3 space-y-1 text-gray-200">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-5 mb-3 space-y-1 text-gray-200">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="text-white font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-[#c9a84c] italic">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-[#c9a84c] pl-4 my-3 text-gray-400 italic">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block bg-[#0a2218] rounded-lg p-4 my-3 text-sm text-[#4acf85] overflow-x-auto font-mono">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-[#0a2218] text-[#4acf85] px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-2">{children}</pre>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-[#4acf85]/30">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left text-[#4acf85] font-semibold px-3 py-2">{children}</th>
        ),
        td: ({ children }) => (
          <td className="text-gray-300 px-3 py-2 border-b border-[#4acf85]/10">{children}</td>
        ),
        hr: () => <hr className="border-[#4acf85]/20 my-4" />,
        a: ({ children, href }) => (
          <a href={href} className="text-[#4acf85] underline hover:text-[#5ddb96]" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
