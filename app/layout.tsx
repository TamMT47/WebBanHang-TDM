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
  themeColor: '#111827',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${nunito.variable} ${robotoMono.variable}`}>
      <body className="min-h-screen bg-gray-100 text-gray-900 font-sans antialiased selection:bg-gray-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
