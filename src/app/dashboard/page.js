import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from './DashboardClient';
import { ClientRedirect } from '@/components/ClientRedirect';
import { joinBackendUrl } from '@/lib/api-base';

export default async function DashboardPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <ClientRedirect path="/login" />;

  let wallets = [];
  try {
    const res = await fetch(joinBackendUrl(`/api/wallets?_t=${Date.now()}`), {
      headers: { 'X-User-Id': user.id },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      wallets = Array.isArray(data) ? data : data.data || [];
    }
  } catch {
    wallets = [];
  }

  const moonpaySuccess = searchParams?.moonpay === 'success';
  const refreshKey = searchParams?.r ?? null;

  return (
    <>
      {moonpaySuccess && (
        <div className="alert alert-success" style={{ margin: '1rem 1.25rem', borderRadius: 12 }}>
          Payment successful. Your crypto has been sent to your wallet and will appear in your portfolio below (usually within a few minutes once MoonPay confirms).
        </div>
      )}
      <DashboardClient initialWallets={wallets} userId={user.id} refreshKey={refreshKey} />
    </>
  );
}
