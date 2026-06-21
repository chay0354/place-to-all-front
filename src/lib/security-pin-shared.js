const PIN_RE = /^\d{6}$/;

export function isValidSecurityPin(pin) {
  return typeof pin === 'string' && PIN_RE.test(pin);
}
