import Link from 'next/link';
import appIcon from '@/app/icon.png';

export function AuthScreen({ kicker, title, lede, showPoints = false, children }) {
  return (
    <div className="auth-screen app-dark">
      <section className="auth-brand" aria-label="Place to All">
        <div className="auth-brand-bg" aria-hidden />
        <div className="auth-brand-inner">
          <Link href="/" className="auth-logo" aria-label="Place to All home">
            <img src={appIcon.src} alt="" width={44} height={44} draggable={false} />
            Place to <span>All</span>
          </Link>
          {kicker ? <p className="auth-kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          {lede ? <p className="auth-brand-lede">{lede}</p> : null}
          {showPoints ? (
            <ul className="auth-points">
              <li>
                <span className="auth-point-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-6" />
                  </svg>
                </span>
                <span>
                  <strong>Live rates</strong>
                  <small>USD prices for every buy and sell.</small>
                </span>
              </li>
              <li>
                <span className="auth-point-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </span>
                <span>
                  <strong>Send and spend</strong>
                  <small>Transfers, cards, and payment links.</small>
                </span>
              </li>
              <li>
                <span className="auth-point-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <span>
                  <strong>Agent network</strong>
                  <small>Refer people and earn on their buys.</small>
                </span>
              </li>
            </ul>
          ) : null}
        </div>
      </section>
      <div className="auth-main">{children}</div>
    </div>
  );
}
