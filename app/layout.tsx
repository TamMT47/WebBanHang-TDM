import type { Metadata, Viewport } from 'next';
import { Nunito, Roboto_Mono } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TD MOBILE STORE - Quản Lý Bán Hàng & Bảo Hành Apple',
  description: 'Hệ thống quản lý bán hàng, tồn kho IMEI, bảo hành, trade-in thu cũ đổi mới và sổ quỹ chuyên dòng Apple.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#080d1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${nunito.variable} ${robotoMono.variable} dark`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('tdm_active_theme');
                if (t) document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#080d1a] text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
