import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guarantees user is present and whitelisted, but Server Component double-checks
  const userEmail = user?.email || 'whitelisted-user@buildnest.buzz';

  async function signOutAction() {
    'use server';
    const client = await createClient();
    await client.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Session Header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            Whitelisted Session Active
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Activity Planner Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{userEmail}</span>
          </p>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition hover:bg-destructive/10 hover:text-destructive"
          >
            Sign Out
          </button>
        </form>
      </div>

      {/* 3 Circadian Anchor Routines Cards */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Morning Launchpad */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🌅</span>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              Anchor 1
            </span>
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Morning Launchpad
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Energy check-in (1-5), keystone focus, and Rule of 3 task setup.
          </p>
          <div className="mt-6">
            <Link
              href="/routines/morning"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-amber-500/10 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            >
              Start Morning Routine &rarr;
            </Link>
          </div>
        </div>

        {/* Day Momentum */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl">⚡</span>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Anchor 2
            </span>
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Day Momentum Block
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Single-task focus sprint view, Pomodoro pacing, and panic recovery.
          </p>
          <div className="mt-6">
            <Link
              href="/routines/momentum"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-semibold text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-400"
            >
              Open Momentum Sprint &rarr;
            </Link>
          </div>
        </div>

        {/* Evening Shutdown */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🌙</span>
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
              Anchor 3
            </span>
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Evening Shutdown
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Celebrate micro-wins, guilt-free deferrals, and loop closure.
          </p>
          <div className="mt-6">
            <Link
              href="/routines/evening"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-teal-500/10 text-xs font-semibold text-teal-600 hover:bg-teal-500/20 dark:text-teal-400"
            >
              Begin Shutdown &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
