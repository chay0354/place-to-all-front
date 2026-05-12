/**
 * Paybis + Transak image rows (inert until integrations are wired).
 * Replace `public/paybis.png` and `public/trans.png` with your brand assets when ready.
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
        aria-label="Transak (coming soon)"
      >
        <img src="/trans.png" alt="" width={320} height={72} draggable={false} />
      </button>
    </div>
  );
}
