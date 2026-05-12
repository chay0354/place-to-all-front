/**
 * Paybis + Trans image rows (inert until integrations are wired).
 * Art is served from `public/paybis.png` and `public/trans.png` (sync from `assets/paybis (1).png` and `assets/trans (1).png` when updating).
 * Not `disabled`: avoids browser dimming so images match MoonPay brightness; `pointer-events: none` + `tabIndex={-1}` keep them inert.
 */
function inertButtonProps() {
  return {
    type: 'button',
    tabIndex: -1,
    'aria-disabled': true,
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  };
}

export function ProviderInertPayButtons({ variant = 'default' }) {
  const wrap =
    variant === 'paylink'
      ? 'provider-inert-pay-buttons provider-inert-pay-buttons--paylink'
      : 'provider-inert-pay-buttons';
  return (
    <div className={wrap}>
      <button
        {...inertButtonProps()}
        className="btn-moonpay-image-only btn-provider-image-inert"
        aria-label="Paybis (coming soon)"
      >
        <img src="/paybis.png" alt="" width={320} height={72} draggable={false} />
      </button>
      <button
        {...inertButtonProps()}
        className="btn-moonpay-image-only btn-provider-image-inert"
        aria-label="Trans (coming soon)"
      >
        <img src="/trans.png" alt="" width={320} height={72} draggable={false} />
      </button>
    </div>
  );
}
