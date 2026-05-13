/**
 * Paybis + Trans image rows (inert until integrations are wired).
 * Art is served from `public/paybis.png` and `public/trans.png` (sync from `assets/paybis (1).png` and `assets/trans (1).png` when updating).
 * Each control sits in a `provider-pay-button-wrap` for layout isolation.
 * Renders a fragment so vertical spacing matches MoonPay (single parent `gap`, same as buy / pay stacks).
 * Not `disabled`: avoids browser dimming vs MoonPay; `pointer-events: none` + `tabIndex={-1}` keep them inert.
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
  const itemWrap =
    variant === 'paylink'
      ? 'provider-pay-button-wrap provider-pay-button-wrap--paylink'
      : 'provider-pay-button-wrap';
  return (
    <>
      <div className={itemWrap}>
        <button
          {...inertButtonProps()}
          className="btn-moonpay-image-only btn-provider-image-inert"
          aria-label="Paybis (coming soon)"
        >
          <img src="/paybis.png" alt="" width={320} height={72} draggable={false} />
        </button>
      </div>
      <div className={itemWrap}>
        <button
          {...inertButtonProps()}
          className="btn-moonpay-image-only btn-provider-image-inert"
          aria-label="Trans (coming soon)"
        >
          <img src="/trans.png" alt="" width={320} height={72} draggable={false} />
        </button>
      </div>
    </>
  );
}
