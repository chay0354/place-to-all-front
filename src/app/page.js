import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <main className="app-dark">
      <div className="hero">
        <h1 className="hero-title">
          Place to <span style={{ color: 'var(--primary)' }}>All</span>
        </h1>
        <p className="hero-desc">
          Your crypto hub. Buy, sell, and transfer Bitcoin, Ethereum, and USDT with live rates and card payments.
        </p>
        <div className="hero-actions">
          <Link href="/login" className="btn btn-primary">
            Log in
          </Link>
          <Link href="/register" className="btn btn-ghost">
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
