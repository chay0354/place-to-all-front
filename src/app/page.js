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
      <div className="hv-top">
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

        <section className="hv-hero">
          <div className="hv-hero-bg" aria-hidden />
          <div className="hv-hero-copy">
            <p className="hv-kicker">Crypto wallet</p>
            <h1>Your crypto, in one account.</h1>
            <p className="hv-lede">
              Buy coins, send them to someone, and pay with a card. Every price is shown in US dollars.
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
      </div>

      <main>
        <HomeReveal>
        <section className="hv-sheet" aria-label="Product highlights">
          <div className="hv-stage">
            <p className="hv-eyebrow">What you can do</p>
            <h2>Buy, send, and pay from one account.</h2>
            <p className="hv-sheet-lede">
              Your coins, your card, and your balance sit together. The dollar price is the same on every screen.
            </p>
            <ul className="hv-feats">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <span className="hv-feat-shot" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      {f.icon}
                    </svg>
                  </span>
                  <div className="hv-feat-copy">
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                    {f.href ? (
                      <Link href={f.href} className="hv-feat-cta">
                        {f.cta}
                      </Link>
                    ) : null}
                  </div>
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
            <p className="hv-eyebrow">Start here</p>
            <h2 id="hv-steps-title">Open your account in three steps.</h2>
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
            <p className="hv-eyebrow">Videos</p>
            <h2 id="hv-guides-title">Watch how it works.</h2>
            <p className="hv-sheet-lede">
              The first video shows the wallet. The second shows payment links, and how agents earn.
            </p>
            <div className="hv-videos">
              <figure>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/tutorials/english.png"
                  src="/tutorials/english.mp4"
                />
                <figcaption>
                  <strong>The wallet</strong>
                  <span>From log in to your card</span>
                </figcaption>
              </figure>
              <figure>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/tutorials/payments.png"
                  src="/tutorials/payments.mp4"
                />
                <figcaption>
                  <strong>Payments</strong>
                  <span>How a payment link works</span>
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
              <h2 id="hv-agents-title">Companies can become agents.</h2>
              <p className="hv-sheet-lede">
                An agent invites people to Place to All and earns part of the fee when those people buy crypto.
              </p>
              <Link href="/register?type=agent" className="hv-agents-cta">
                Apply to be an agent
              </Link>
            </div>
            <ul className="hv-checks">
              <li>Fill in your company details on the form.</li>
              <li>We check the request. No account opens until we approve it.</li>
              <li>Sign the company agreement, then receive your invite links.</li>
              <li>See each purchase and fee from the people you invited.</li>
            </ul>
          </div>
        </section>
        </HomeReveal>

        <HomeReveal>
        <section className="hv-band" aria-labelledby="hv-security-title">
          <div className="hv-stage">
            <p className="hv-eyebrow">Security</p>
            <h2 id="hv-security-title">Your account stays locked to you.</h2>
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
              <h2 id="hv-faq-title">Common questions.</h2>
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
            <h2 id="hv-final-title">Ready to start?</h2>
            <p>Create an account. It takes a few minutes.</p>
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
            <Link href="/register?type=agent">Become an agent</Link>
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
    text: 'Buy Bitcoin, Ethereum, and other coins with a card. Sell them when you want.',
    icon: (
      <>
        <path d="M4 19h16" />
        <path d="M7 15l4-5 3 2 5-7" />
      </>
    ),
  },
  {
    title: 'Send and receive',
    text: 'Send coins by email or username. You can also receive coins from another wallet.',
    icon: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  },
  {
    title: 'A card you can spend',
    text: 'Pay with your balance. Add the card to Apple Wallet, or freeze it if you need to stop it.',
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 14h4" />
      </>
    ),
  },
  {
    title: 'Prices in dollars',
    text: 'The price you see is the current dollar price, on every screen.',
    icon: (
      <>
        <path d="M4 16l5-5 3 3 8-8" />
        <path d="M14 6h6v6" />
      </>
    ),
  },
  {
    title: 'Your balance',
    text: 'See what you hold, which coins you have, and what you did. All of it in dollars.',
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 9 9h-9V3z" />
        <path d="M13 3.1A9 9 0 0 1 20.9 11H13V3.1z" />
      </>
    ),
  },
  {
    title: 'For companies',
    text: 'A company we approve can invite customers and earn when those customers buy.',
    icon: (
      <>
        <path d="M4 20h16" />
        <path d="M6 20V7l6-3 6 3v13" />
        <path d="M10 20v-4h4v4M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
      </>
    ),
    href: '/register?type=agent',
    cta: 'Register your company',
  },
];

const STEPS = [
  {
    title: 'Sign up',
    text: 'Enter your name, phone, address, and ID details.',
  },
  {
    title: 'Confirm it is you',
    text: 'Verify your phone, upload your ID, and choose a PIN.',
  },
  {
    title: 'Use your account',
    text: 'Buy coins with a card, send them to someone, or pay with your card.',
  },
];

const SECURITY = [
  { title: 'A PIN', text: 'You need a PIN to open the wallet on your phone.' },
  { title: 'An ID check', text: 'Your account is tied to your ID or passport.' },
  { title: 'A phone check', text: 'We send a code to the phone number on your account.' },
  { title: 'Card controls', text: 'Freeze a card, set a spending limit, and see every card payment.' },
];

const FAQ = [
  {
    q: 'Which coins can I buy?',
    a: 'Bitcoin, Ethereum, Solana, USDT, USDC, and many more. Prices are in US dollars.',
  },
  {
    q: 'Does someone need an account to pay me?',
    a: 'No. They open your payment link and pay by card. They do not create an account.',
  },
  {
    q: 'How do I become an agent?',
    a: 'Agents are companies. Fill in the company form. We open an account only after we approve you and you sign the company agreement.',
  },
  {
    q: 'I forgot my password.',
    a: 'On the log in screen, choose Reset password. We email you a link so you can choose a new one.',
  },
];
