import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
}

interface ParsedLine {
  type: "text" | "bullet" | "numbered" | "header" | "block-math";
  content: string;
  level?: number;
  num?: string;
}

export function MathText({ text }: MathTextProps) {
  if (!text) return null;

  const lines = text.split("\n");
  const parsedLines: ParsedLine[] = [];
  let inMathBlock = false;
  let mathBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inMathBlock) {
      if (trimmed.endsWith("$$")) {
        const lastPart = trimmed.slice(0, -2).trim();
        if (lastPart) {
          mathBlockContent.push(lastPart);
        }
        parsedLines.push({
          type: "block-math",
          content: mathBlockContent.join("\n"),
        });
        inMathBlock = false;
        mathBlockContent = [];
      } else {
        mathBlockContent.push(line);
      }
      continue;
    }

    if (trimmed.startsWith("$$")) {
      if (trimmed.endsWith("$$") && trimmed.length > 2) {
        parsedLines.push({
          type: "block-math",
          content: trimmed.slice(2, -2).trim(),
        });
      } else {
        inMathBlock = true;
        const firstPart = trimmed.slice(2).trim();
        if (firstPart) {
          mathBlockContent.push(firstPart);
        }
      }
      continue;
    }

    // Check for lists and headers
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      parsedLines.push({
        type: "bullet",
        content: line.replace(/^\s*[-*]\s+/, ""),
      });
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+/);
      const num = match ? match[1] : "";
      parsedLines.push({
        type: "numbered",
        num,
        content: line.replace(/^\s*\d+\.\s+/, ""),
      });
    } else if (trimmed.startsWith("#")) {
      const headerMatch = trimmed.match(/^(#+)\s+(.*)$/);
      if (headerMatch) {
        parsedLines.push({
          type: "header",
          level: headerMatch[1].length,
          content: headerMatch[2],
        });
      } else {
        parsedLines.push({ type: "text", content: line });
      }
    } else {
      parsedLines.push({ type: "text", content: line });
    }
  }

  // Handle unclosed math blocks gracefully
  if (inMathBlock && mathBlockContent.length > 0) {
    parsedLines.push({
      type: "block-math",
      content: mathBlockContent.join("\n"),
    });
  }

  // Renders inline items: bold (**text**), inline math ($math$), inline code (`code`)
  function renderInlineContent(content: string) {
    const parts = content.split(/(\$[\s\S]*?\$|\*\*[\s\S]*?\*\*|`[\s\S]*?`)/g);

    return parts.map((part, index) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        const math = part.slice(1, -1).trim();
        if (math === "") return <span key={index}>$</span>;
        try {
          const html = katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="inline-block px-0.5 font-sans align-middle"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          return (
            <code key={index} className="px-1 py-0.5 bg-rose-50 text-rose-600 rounded font-mono text-xs">
              {math}
            </code>
          );
        }
      } else if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      } else if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="px-1.5 py-0.5 bg-slate-100 text-emerald-700 font-mono text-xs font-semibold rounded">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  return (
    <span className="block space-y-1">
      {parsedLines.map((lineObj, idx) => {
        switch (lineObj.type) {
          case "block-math":
            try {
              const html = katex.renderToString(lineObj.content, {
                displayMode: true,
                throwOnError: false,
              });
              return (
                <span
                  key={idx}
                  className="block my-3 p-4 bg-slate-50 border-l-4 border-emerald-500 rounded-r-xl overflow-x-auto shadow-sm text-slate-800"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch (e) {
              return (
                <pre
                  key={idx}
                  className="block my-2 p-3 bg-rose-50 border-l-4 border-rose-500 font-mono text-xs overflow-x-auto text-rose-800 rounded-r-xl"
                >
                  {lineObj.content}
                </pre>
              );
            }
          case "bullet":
            return (
              <span key={idx} className="flex items-start ml-4 my-1.5 leading-relaxed text-slate-700">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2.5 shrink-0 mt-2" />
                <span className="flex-1">{renderInlineContent(lineObj.content)}</span>
              </span>
            );
          case "numbered":
            return (
              <span key={idx} className="flex items-start ml-4 my-1.5 leading-relaxed text-slate-700">
                <span className="font-bold text-emerald-600 mr-2 shrink-0">{lineObj.num}.</span>
                <span className="flex-1">{renderInlineContent(lineObj.content)}</span>
              </span>
            );
          case "header": {
            const lvl = lineObj.level || 1;
            const headerClass =
              lvl === 1
                ? "text-lg font-extrabold text-slate-900 mt-4 mb-2"
                : lvl === 2
                ? "text-base font-bold text-slate-900 mt-3.5 mb-1.5"
                : "text-sm font-bold text-slate-900 mt-3 mb-1";
            return (
              <span key={idx} className={`block ${headerClass}`}>
                {renderInlineContent(lineObj.content)}
              </span>
            );
          }
          case "text":
          default:
            if (lineObj.content.trim() === "") {
              return <span key={idx} className="block h-2" />;
            }
            return (
              <span key={idx} className="block my-1 leading-relaxed text-slate-700">
                {renderInlineContent(lineObj.content)}
              </span>
            );
        }
      })}
    </span>
  );
}
