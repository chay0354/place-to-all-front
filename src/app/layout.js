import './globals.css';

export const metadata = {
  title: 'Place to All – Crypto',
  description: 'Transfer, buy and sell crypto',
};

/** Mobile: correct scaling, notch/home-indicator safe areas, dark browser chrome. */
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell">{children}</body>
    </html>
  );
}
