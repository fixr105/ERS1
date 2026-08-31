import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { WebhookValidator } from '@/components/WebhookValidator';

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
    <html lang="en">
      <body>
        <Providers>
          <WebhookValidator />
          {children}
        </Providers>
      </body>
    </html>
  );
}
