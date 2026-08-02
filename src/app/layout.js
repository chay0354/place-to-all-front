import './globals.css';
import { DisableTextCopy } from '@/components/DisableTextCopy';

export const metadata = {
  title: 'Place to All – Crypto',
  description: 'Transfer, buy and sell crypto',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
};

/** Mobile: correct scaling, notch/home-indicator safe areas, dark browser chrome. */
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#F5F8FC',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <DisableTextCopy />
        {children}
      </body>
    </html>
  );
}
