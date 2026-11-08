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
          <div className="hv-stage">
            <div className="hv-copy">
              <p className="hv-eyebrow">One wallet</p>
              <h2>
                Spend crypto <em>anywhere.</em>
              </h2>
              <p className="hv-sheet-lede">
                Buy, send, and hold from the same balance. Every move uses a live USD rate.
              </p>
            </div>
            <div className="hv-cardstage" aria-hidden>
              <div className="hv-glow" />
              <div className="hv-card hv-card-back" />
              <article className="hv-card hv-card-front">
                <div className="hv-card-top">
                  <span className="hv-card-brand">
                    <span className="hv-card-mark">P</span>
                    Place to All
                  </span>
                  <svg className="hv-card-wave" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M8 8.5a6 6 0 0 1 0 7" />
                    <path d="M11.5 6a9 9 0 0 1 0 12" />
                    <path d="M15 3.5a12 12 0 0 1 0 17" />
                  </svg>
                </div>
                <span className="hv-card-chip" />
                <div className="hv-card-bottom">
                  <span className="hv-card-num">•••• 4821</span>
                  <span className="hv-card-meta">Virtual · USD</span>
                </div>
              </article>
            </div>
          </div>
          <ul className="hv-rail">
            <li>
              <strong>Bitcoin</strong>
              <span>Live USD price</span>
            </li>
            <li>
              <strong>Ethereum</strong>
              <span>Same rate in the app</span>
            </li>
            <li>
              <strong>USDT</strong>
              <span>A dollar you can send</span>
            </li>
            <li>
              <strong>Transfers</strong>
              <span>Email or handle</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
