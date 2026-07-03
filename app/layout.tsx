import type {Metadata} from 'next';
import './globals.css'; // Global styles
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Gia sư Toán Lớp 6-9 - Kiến tạo Tư duy Toán học',
  description: 'Hệ thống học toán thông minh dành cho học sinh THCS tại Việt Nam. Học sinh tự giải quyết bài toán từng bước dưới sự định hướng tận tình của gia sư AI.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="vi">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" 
          integrity="sha384-GMR9mG77DX2ddHs+xsKaCX60fYr66NG3yb13Tiu79HYg1xgmRY3ryax0469b8D7F" 
          crossOrigin="anonymous"
        />
      </head>
      <body suppressHydrationWarning>
        <Script 
          src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
