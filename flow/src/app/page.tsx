import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden flex flex-col flex-1">
      {/* Dedicated Marketing Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              Flow
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Background soft ambient gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/10 via-sky-400/10 to-teal-300/10 blur-3xl"
      />

      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-16 text-center sm:px-6 lg:px-8 lg:pt-24 lg:pb-24">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-tight">
          Flow — Activity Planner
        </h1>

        <p className="mt-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Find your rhythm.{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-teal-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-teal-400">
            Build steady momentum.
          </span>
        </p>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          A calm, flexible space to structure your day around energy, not rigid clock-time.
          Focus on what matters most, take small gentle steps, and make progress without the overwhelm.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 sm:w-auto"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-7 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-accent sm:w-auto"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-4 text-xs font-medium text-muted-foreground">
          Private Preview &bull; Invite Only
        </p>
      </section>

      {/* 3 Daily Anchor Routines Showcase */}
      <section className="border-t border-border bg-card/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              3 Daily Anchor Routines
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A balanced rhythm that adapts to how you feel, replacing rigid schedules with clarity.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Anchor 1: Morning Launchpad */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-xl font-bold text-amber-500">
                🌅
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                1. Morning Launchpad
              </h3>
              <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                Calm Start &amp; Daily Focus
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Check in with your morning energy and commit to one single Keystone priority for the day, keeping your mind clear and intentional.
              </p>
            </div>

            {/* Anchor 2: Day Momentum Block */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl font-bold text-indigo-500">
                ⚡
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                2. Day Momentum Block
              </h3>
              <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Focused Sprints &amp; Active Resets
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Work in focused, distraction-free blocks with built-in micro-breaks to keep your body active and your mind refreshed.
              </p>
            </div>

            {/* Anchor 3: Evening Shutdown */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-xl font-bold text-teal-500">
                🌙
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                3. Evening Shutdown
              </h3>
              <p className="mt-1 text-xs font-medium text-teal-600 dark:text-teal-400">
                Reflection &amp; Rest
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Acknowledge today&apos;s small wins, roll unfinished items to tomorrow without guilt, and step away from work with true closure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* "Unstick Me" Feature Showcase */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-indigo-500/20 bg-card p-8 sm:p-10 shadow-sm">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="max-w-xl text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Instant Inertia Breaker
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  Feeling Stuck? Tap &quot;Unstick Me&quot;.
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  When starting feels hard, planning only causes resistance. The Unstick Me action gives you one simple 2-to-5 minute activation task—a quick stretch, a glass of water, or opening one document—to get momentum moving effortlessly.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <Link
                  href="/unstick?from=home"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                >
                  Try Unstick Me &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
