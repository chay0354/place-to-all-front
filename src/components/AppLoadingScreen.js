import appIcon from '@/app/icon.png';

/**
 * Branded loading state — app logo with a subtle pulse (no "Loading…" text).
 */
export function AppLoadingScreen({ fullScreen = true, className = '', size = 72 }) {
  return (
    <div
      className={[
        'app-loading-screen',
        fullScreen ? 'app-loading-screen--full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <img
        src={appIcon.src}
        alt=""
        className="app-loading-screen-logo"
        width={size}
        height={size}
        draggable={false}
        decoding="async"
      />
    </div>
  );
}
