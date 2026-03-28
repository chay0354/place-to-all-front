/** Must match backend ADMIN_OPERATOR_EMAIL (default admin@admin.com). */
export const ADMIN_OPERATOR_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_OPERATOR_EMAIL || 'admin@admin.com')
  .toLowerCase()
  .trim();

export function isAdminOperatorEmail(email) {
  return (email || '').toLowerCase().trim() === ADMIN_OPERATOR_EMAIL;
}
