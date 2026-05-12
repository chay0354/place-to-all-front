/**
 * Paybis + Trans image rows (inert until integrations are wired).
 * Brand files: `public/paybis.png`, `public/trans.png` (keep in sync with `assets/` if you store sources there).
 */
export function ProviderInertPayButtons({ variant = 'default' }) {
  const wrap =
    variant === 'paylink'
      ? 'provider-inert-pay-buttons provider-inert-pay-buttons--paylink'
      : 'provider-inert-pay-buttons';
  return (
    <div className={wrap}>
      <button
        type="button"
        disabled
        className="btn-moonpay-image-only btn-provider-image-inert"
        aria-label="Paybis (coming soon)"
      >
        <img src="/paybis.png" alt="" width={320} height={72} draggable={false} />
      </button>
      <button
        type="button"
        disabled
        className="btn-moonpay-image-only btn-provider-image-inert"
        aria-label="Trans (coming soon)"
      >
        <img src="/trans.png" alt="" width={320} height={72} draggable={false} />
      </button>
    </div>
  );
}
