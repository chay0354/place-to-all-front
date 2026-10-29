import './coming-soon.css';
import appIcon from '../icon.png';

export const metadata = {
  title: 'Place to All — Coming soon',
  description: 'Place to All is coming soon. Your money, in one place.',
};

export default function ComingSoonPage() {
  return (
    <main className="coming-soon">
      <div className="coming-soon-bg" aria-hidden />
      <div className="coming-soon-inner">
        <img
          src={appIcon.src}
          alt=""
          className="coming-soon-mark"
          width={72}
          height={72}
          draggable={false}
        />
        <p className="coming-soon-brand">
          Place to <span>All</span>
        </p>
        <h1>Coming soon</h1>
        <p className="coming-soon-tag">Your money, in one place.</p>
      </div>
    </main>
  );
}
