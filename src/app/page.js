import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ClientRedirect } from '@/components/ClientRedirect';
import appIcon from './icon.png';
import './home.css';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return <ClientRedirect path="/dashboard" />;

  return (
    <div className="hv">
      <header className="hv-bar">
        <Link href="/" className="hv-logo" aria-label="Place to All home">
          <img src={appIcon.src} alt="" width={36} height={36} draggable={false} />
          <span>
            Place to <em>All</em>
          </span>
        </Link>
        <nav className="hv-nav" aria-label="Account">
          <Link href="/login" className="hv-login">
            Log in
          </Link>
          <Link href="/register" className="hv-join">
            Create account
          </Link>
        </nav>
      </header>

      <main>
        <section className="hv-hero">
          <div className="hv-hero-bg" aria-hidden />
          <div className="hv-hero-copy">
            <p className="hv-kicker">Crypto wallet</p>
            <h1>Your money, one place.</h1>
            <p className="hv-lede">
              Buy, sell, and transfer Bitcoin, Ethereum, and stablecoins with live USD rates and card checkout.
            </p>
            <div className="hv-actions">
              <Link href="/register" className="hv-primary">
                Get started
              </Link>
              <Link href="/login" className="hv-secondary">
                I have an account
              </Link>
            </div>
          </div>
        </section>

        <section className="hv-sheet" aria-label="Product highlights">
          <h2>Spend crypto anywhere.</h2>
          <ul className="hv-pills">
            <li><span className="hv-dot" data-tone="btc" aria-hidden />Bitcoin</li>
            <li><span className="hv-dot" data-tone="eth" aria-hidden />Ethereum</li>
            <li><span className="hv-dot" data-tone="usdt" aria-hidden />USDT</li>
            <li><span className="hv-dot" data-tone="card" aria-hidden />Cards</li>
            <li><span className="hv-dot" data-tone="send" aria-hidden />Send</li>
            <li><span className="hv-dot" data-tone="shop" aria-hidden />Shop</li>
            <li><span className="hv-dot" data-tone="bills" aria-hidden />Bills</li>
            <li><span className="hv-dot" data-tone="usd" aria-hidden />USD</li>
          </ul>
          <div className="hv-cardblock">
            <h3>Place to All card</h3>
            <p>Buy, send, and hold from one wallet, with live USD rates on every move.</p>
            <div className="hv-cards" aria-hidden>
              <div className="hv-plastic hv-plastic-back">
                <span>Place to All</span>
              </div>
              <div className="hv-plastic hv-plastic-front">
                <span className="hv-plastic-brand">
                  <span className="hv-plastic-mark">P</span>
                  Place to All
                </span>
                <span className="hv-plastic-chip" />
                <span className="hv-plastic-num">•••• 4821</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
