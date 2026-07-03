'use client';

import React, { useEffect, useState } from 'react';

interface MathSegment {
  type: 'text' | 'inline' | 'block';
  content: string;
}

// Robust mathematical parser to split LaTeX formulas from general text
function parseMathText(text: string): MathSegment[] {
  if (!text) return [];
  const segments: MathSegment[] = [];
  let currentIdx = 0;
  
  // Match double dollar signs $$...$$ (block math) first, then single dollar sign $...$ (inline math)
  // Using [\s\S]*? to support multi-line match in a way that is fully compatible with ES2017 target
  const mathRegex = /(\$\$([\s\S]*?)\$\$)|(\$([\s\S]*?)\$)/g;
  
  let match;
  while ((match = mathRegex.exec(text)) !== null) {
    const matchIdx = match.index;
    
    // Text before math
    if (matchIdx > currentIdx) {
      segments.push({
        type: 'text',
        content: text.substring(currentIdx, matchIdx)
      });
    }
    
    // Check if block or inline math
    if (match[1] !== undefined) {
      segments.push({
        type: 'block',
        content: match[2].trim()
      });
    } else if (match[3] !== undefined) {
      segments.push({
        type: 'inline',
        content: match[4].trim()
      });
    }
    
    currentIdx = mathRegex.lastIndex;
  }
  
  // Text after math
  if (currentIdx < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(currentIdx)
    });
  }
  
  return segments;
}

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({ text, className = '' }: MathTextProps) {
  const [isKaTeXReady, setIsKaTeXReady] = useState(false);

  useEffect(() => {
    // Check if KaTeX is available in the global window object
    const checkKaTeX = () => {
      if (typeof window !== 'undefined' && (window as any).katex) {
        setIsKaTeXReady(true);
        return true;
      }
      return false;
    };

    if (checkKaTeX()) return;

    // Retry polling for KaTeX script loading
    const interval = setInterval(() => {
      if (checkKaTeX()) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const segments = parseMathText(text);

  if (segments.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline-wrap leading-relaxed ${className}`}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        }

        const isBlock = segment.type === 'block';

        if (isKaTeXReady) {
          try {
            const html = (window as any).katex.renderToString(segment.content, {
              displayMode: isBlock,
              throwOnError: false,
              trust: true,
            });

            if (isBlock) {
              return (
                <div
                  key={index}
                  className="my-3 overflow-x-auto py-1 flex justify-center text-center max-w-full"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } else {
              return (
                <span
                  key={index}
                  className="inline-block px-1 align-middle"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            }
          } catch (e) {
            console.error("KaTeX rendering error:", e);
          }
        }

        // Fallback styling if KaTeX is not loaded yet or fails
        if (isBlock) {
          return (
            <div
              key={index}
              className="my-3 font-mono text-center bg-gray-50 border border-gray-100 rounded p-2 text-sm text-emerald-800 overflow-x-auto"
            >
              {segment.content}
            </div>
          );
        } else {
          return (
            <code
              key={index}
              className="px-1 py-0.5 mx-1 font-serif bg-emerald-50 text-emerald-900 border border-emerald-100 rounded text-sm italic inline-block align-middle font-semibold"
            >
              {segment.content}
            </code>
          );
        }
      })}
    </span>
  );
}
