import React from "react";

interface MathTextProps {
  text: string;
}

export function MathText({ text }: MathTextProps) {
  if (!text) return null;

  // Split text by $$ (block math) and $ (inline math)
  const blocks = text.split(/(\$\$.*?\$\$|\$.*?\$)/g);

  return (
    <span className="leading-relaxed">
      {blocks.map((block, index) => {
        if (block.startsWith("$$") && block.endsWith("$$")) {
          const math = block.slice(2, -2).trim();
          return (
            <span
              key={index}
              className="block my-2 p-2 bg-slate-50 border-l-4 border-emerald-500 font-mono text-sm overflow-x-auto text-slate-800"
            >
              {math}
            </span>
          );
        } else if (block.startsWith("$") && block.endsWith("$")) {
          const math = block.slice(1, -1).trim();
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 bg-slate-100 rounded text-amber-700 font-mono text-xs font-semibold"
            >
              {math}
            </code>
          );
        }
        return <span key={index}>{block}</span>;
      })}
    </span>
  );
}
