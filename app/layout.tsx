import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { WebhookValidator } from '@/components/WebhookValidator';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Seven Fincorp — Monthly Review System',
  description: 'AI-powered monthly performance review system for Seven Fincorp employees.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <Providers>
          <WebhookValidator />
          {children}
        </Providers>
      </body>
    </html>
  );
}
