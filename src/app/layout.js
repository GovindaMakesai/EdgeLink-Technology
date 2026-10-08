import { IBM_Plex_Mono, Outfit, Syne } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const display = Syne({ subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700'] });
const sans = Outfit({ subsets: ['latin'], variable: '--font-sans', weight: ['300', '400', '500', '600'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edgelinktechnology.vercel.app';

export const metadata = {
  metadataBase: new URL(appUrl),
  title: { default: 'EdgeLink SEO Intelligence', template: '%s · EdgeLink' },
  description: 'Queued SEO audits, live pipeline progress, and client-ready reports.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
