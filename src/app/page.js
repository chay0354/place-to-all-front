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
          <h2>What you get</h2>
          <div className="hv-grid">
            <article>
              <span className="hv-ico" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </span>
              <h3>Buy and sell</h3>
              <p>USD prices from the same spot data used across the app.</p>
            </article>
            <article>
              <span className="hv-ico" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </span>
              <h3>Send freely</h3>
              <p>Transfer to people by email or handle, built for everyday use.</p>
            </article>
            <article>
              <span className="hv-ico" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <h3>One portfolio</h3>
              <p>Balances, cards, and activity together on a single screen.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
