import { createClient } from '@/lib/supabase/server';
import { getProfileFromSupabaseServer } from '@/lib/profile-server';
import { isAdminOperatorEmail } from '@/lib/admin-config';
import { DashboardClient } from './DashboardClient';
import { ClientRedirect } from '@/components/ClientRedirect';
import { joinBackendUrl } from '@/lib/api-base';
import { fetchCoinGeckoMarkets } from '@/lib/coingecko-prices-server';

export default async function DashboardPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <ClientRedirect path="/login" />;

  let wallets = [];
  let transactions = [];
  let canSeeAffiliation = false;
  let initialCoinGecko = null;
  try {
    const profile = await getProfileFromSupabaseServer(supabase, user.id).catch(() => null);
    const role = profile?.role || 'regular';
    const isAgentLike = role === 'agent' || role === 'super_agent' || role === 'super_super_agent';
    canSeeAffiliation = isAgentLike || role === 'admin' || isAdminOperatorEmail(user.email);

    const [walletsRes, txRes] = await Promise.all([
      fetch(joinBackendUrl(`/api/wallets?_t=${Date.now()}`), {
        headers: { 'X-User-Id': user.id },
        cache: 'no-store',
      }),
      fetch(joinBackendUrl('/api/transactions'), {
        headers: { 'X-User-Id': user.id },
        cache: 'no-store',
      }),
    ]);
    const walletsData = await walletsRes.json().catch(() => ({}));
    if (walletsRes.ok) {
      wallets = Array.isArray(walletsData) ? walletsData : walletsData.data || [];
    }
    const txData = await txRes.json().catch(() => ({}));
    if (txRes.ok) {
      transactions = Array.isArray(txData) ? txData : [];
    }

    const symbols = [...new Set(wallets.map((w) => String(w.currency || '').trim().toUpperCase()).filter(Boolean))];
    if (symbols.length > 0) {
      initialCoinGecko = await fetchCoinGeckoMarkets(symbols);
    }
  } catch {
    wallets = [];
    transactions = [];
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
      <DashboardClient
        initialWallets={wallets}
        initialTransactions={transactions}
        userId={user.id}
        refreshKey={refreshKey}
        canSeeAffiliation={canSeeAffiliation}
        initialCoinGecko={initialCoinGecko}
      />
    </>
  );
}
