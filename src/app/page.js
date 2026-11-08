import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ClientRedirect } from '@/components/ClientRedirect';
import { HomeReveal } from '@/components/HomeReveal';
import { PayStory } from '@/components/PayStory';
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

        <HomeReveal>
        <section className="hv-sheet" aria-label="Product highlights">
          <div className="hv-stage">
            <p className="hv-eyebrow">The wallet</p>
            <h2>Everything you do with crypto, in one account.</h2>
            <p className="hv-sheet-lede">
              Buy, hold, send, and spend from a single balance, priced in USD from the same live data everywhere in
              the app.
            </p>
            <ul className="hv-feats">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <span className="hv-feat-ico" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {f.icon}
                    </svg>
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        </HomeReveal>

        <PayStory />

        <HomeReveal>
        <section className="hv-band" aria-labelledby="hv-steps-title">
          <div className="hv-stage">
            <p className="hv-eyebrow">Getting started</p>
            <h2 id="hv-steps-title">Open an account in three steps.</h2>
            <ol className="hv-steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="hv-step-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        </HomeReveal>

        <HomeReveal>
        <section className="hv-band hv-band-alt" aria-labelledby="hv-guides-title">
          <div className="hv-stage">
            <p className="hv-eyebrow">Guides</p>
            <h2 id="hv-guides-title">Watch the full walkthrough.</h2>
            <p className="hv-sheet-lede">Every screen, from log in to card settings. Available in Hebrew and English.</p>
            <div className="hv-videos">
              <figure>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/tutorials/hebrew.png"
                  src="/tutorials/hebrew.mp4"
                />
                <figcaption>
                  <strong>Hebrew</strong>
                  <span>עברית</span>
                </figcaption>
              </figure>
              <figure>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/tutorials/english.png"
                  src="/tutorials/english.mp4"
                />
                <figcaption>
                  <strong>English</strong>
                  <span>Walkthrough</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>
        </HomeReveal>

        <HomeReveal>
        <section className="hv-band hv-agents" aria-labelledby="hv-agents-title">
          <div className="hv-stage hv-agents-grid">
            <div>
              <p className="hv-eyebrow">For companies</p>
              <h2 id="hv-agents-title">Become a Place to All agent.</h2>
              <p className="hv-sheet-lede">
                Agents are limited companies that bring customers to the wallet and earn a share of the fee on their
                crypto purchases.
              </p>
              <Link href="/register?type=agent" className="hv-agents-cta">
                Apply as an agent
              </Link>
            </div>
            <ul className="hv-checks">
              <li>Send your company details through the application form.</li>
              <li>We review the request. No account is opened before approval.</li>
              <li>Sign the company agreement, then get your referral links.</li>
              <li>Track every referred purchase and fee from the affiliation screen.</li>
            </ul>
          </div>
        </section>
        </HomeReveal>

        <HomeReveal>
        <section className="hv-band" aria-labelledby="hv-security-title">
          <div className="hv-stage">
            <p className="hv-eyebrow">Security</p>
            <h2 id="hv-security-title">Protection on every account.</h2>
            <ul className="hv-secure">
              {SECURITY.map((s) => (
                <li key={s.title}>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        </HomeReveal>

        <HomeReveal>
        <section className="hv-band hv-band-alt" aria-labelledby="hv-faq-title">
          <div className="hv-stage hv-faq-grid">
            <div>
              <p className="hv-eyebrow">Questions</p>
              <h2 id="hv-faq-title">Frequently asked.</h2>
            </div>
            <div className="hv-faq">
              {FAQ.map((q) => (
                <details key={q.q}>
                  <summary>{q.q}</summary>
                  <p>{q.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        </HomeReveal>

        <section className="hv-final" aria-labelledby="hv-final-title">
          <div className="hv-stage">
            <h2 id="hv-final-title">Your money, one place.</h2>
            <p>Create an account in a few minutes and start with live USD rates.</p>
            <div className="hv-final-actions">
              <Link href="/register" className="hv-primary">
                Create account
              </Link>
              <Link href="/login" className="hv-secondary">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="hv-foot">
        <div className="hv-stage hv-foot-row">
          <span className="hv-foot-brand">
            <img src={appIcon.src} alt="" width={28} height={28} draggable={false} />
            Place to All
          </span>
          <nav aria-label="Footer">
            <Link href="/login">Log in</Link>
            <Link href="/register">Create account</Link>
            <Link href="/register?type=agent">Agents</Link>
            <Link href="/forgot-password">Reset password</Link>
          </nav>
          <small>© {new Date().getFullYear()} Place to All</small>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    title: 'Buy and sell',
    text: 'Bitcoin, Ethereum, and stablecoins at live USD prices, with card checkout.',
    icon: (
      <>
        <path d="M4 19h16" />
        <path d="M7 15l4-5 3 2 5-7" />
      </>
    ),
  },
  {
    title: 'Send and receive',
    text: 'Transfer to anyone by email or handle, and deposit from your own wallet.',
    icon: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  },
  {
    title: 'Cards',
    text: 'Pay with your balance, add the card to Apple Wallet, freeze it in one tap.',
    icon: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
        <path d="M2.5 10h19M6.5 15h4" />
      </>
    ),
  },
  {
    title: 'Live USD rates',
    text: 'Every buy, sell, and payment uses the same spot price, shown in dollars.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M9.5 10.2c.4-.8 1.2-1.2 2.5-1.2 1.5 0 2.4.7 2.4 1.8S13.5 12.5 12 12.5 9.6 13.2 9.6 14.3 10.6 16 12.1 16c1.2 0 2-.4 2.4-1.1" />
      </>
    ),
  },
  {
    title: 'Portfolio',
    text: 'Balances, assets, and activity together, valued in USD.',
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-9-9" />
        <path d="M21 12h-9V3a9 9 0 0 1 9 9z" />
      </>
    ),
  },
  {
    title: 'Agent network',
    text: 'Approved companies refer customers and earn on their purchases.',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" />
      </>
    ),
  },
];

const STEPS = [
  {
    title: 'Create your account',
    text: 'Add your name, contact details, and the identity document you will verify with.',
  },
  {
    title: 'Verify and secure',
    text: 'Confirm your phone, upload your ID, and set a PIN for the app.',
  },
  {
    title: 'Buy, send, and spend',
    text: 'Buy crypto by card, send it to others, and pay with your card.',
  },
];

const SECURITY = [
  { title: 'App PIN', text: 'A PIN is required to open the wallet on your device.' },
  { title: 'Identity check', text: 'Accounts are tied to a verified ID or passport.' },
  { title: 'Phone verification', text: 'A one-time code confirms the number on your account.' },
  { title: 'Card controls', text: 'Freeze, set limits, and review every card transaction.' },
];

const FAQ = [
  {
    q: 'Which coins can I buy?',
    a: 'Bitcoin, Ethereum, Solana, stablecoins like USDT and USDC, and many more, priced in USD from the same live data used across the app.',
  },
  {
    q: 'Do people need an account to pay me?',
    a: 'No. A payment link can be paid by card without creating an account.',
  },
  {
    q: 'How do I become an agent?',
    a: 'Agents are limited companies. Submit the company application. An account is opened only after we approve it and a company agreement is signed.',
  },
  {
    q: 'I forgot my password. What now?',
    a: 'Use Reset password on the log in screen. We email you a link to choose a new one.',
  },
];
