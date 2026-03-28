import './globals.css';

export const metadata = {
  title: 'Place to All – Crypto',
  description: 'Transfer, buy and sell crypto',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell">{children}</body>
    </html>
  );
}
