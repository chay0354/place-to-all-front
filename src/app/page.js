import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ClientRedirect } from '@/components/ClientRedirect';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return <ClientRedirect path="/dashboard" />;

  return (
    <div className="home-root">
      <header className="home-topbar">
        <div className="home-topbar-inner">
          <Link href="/" className="home-topbar-logo" aria-label="Place to All home">
            <span className="home-topbar-mark">PtA</span>
            <span className="home-topbar-wordmark">
              Place to <span className="home-topbar-accent">All</span>
            </span>
          </Link>
          <nav className="home-topbar-nav" aria-label="Account">
            <Link href="/login" className="home-topbar-link">
              Log in
            </Link>
            <Link href="/register" className="home-topbar-cta">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-dark home-landing">
        <div className="home-landing-bg" aria-hidden />
        <div className="home-landing-inner">
          <div className="home-landing-panel">
            <p className="hero-eyebrow">Crypto wallet</p>
            <h1 className="hero-title">
              Your money, <span className="hero-accent">one place</span>
            </h1>
            <p className="hero-desc">
              Buy, sell, and transfer Bitcoin, Ethereum, stablecoins and more — live USD rates and card checkout in a
              single app.
            </p>
            <ul className="hero-highlights" aria-label="What you can do">
              <li>Live rates</li>
              <li>Transfer</li>
              <li>Card checkout</li>
            </ul>
            <div className="hero-actions">
              <Link href="/register" className="btn btn-primary btn-hero-primary">
                Get started
              </Link>
              <Link href="/login" className="btn btn-ghost btn-hero-ghost">
                I have an account
              </Link>
            </div>
          </div>
        </div>

        <section className="home-features-band" aria-label="Product highlights">
          <div className="home-features-band-inner">
            <h2 className="home-features-heading">What you get</h2>
            <div className="home-features">
              <article className="home-feature-tile">
                <div className="home-feature-icon home-feature-icon--buy" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </div>
                <h3 className="home-feature-title">Buy & sell</h3>
                <p className="home-feature-desc">
                  Clear USD pricing using the same Coinbase spot data as the rest of the app.
                </p>
              </article>
              <article className="home-feature-tile">
                <div className="home-feature-icon home-feature-icon--send" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </div>
                <h3 className="home-feature-title">Send freely</h3>
                <p className="home-feature-desc">Send to people by email or handle — built for everyday transfers.</p>
              </article>
              <article className="home-feature-tile">
                <div className="home-feature-icon home-feature-icon--shield" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="home-feature-title">Portfolio view</h3>
                <p className="home-feature-desc">Dark, focused dashboard: balances and activity in one screen.</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
