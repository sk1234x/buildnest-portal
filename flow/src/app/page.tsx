import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background radial gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/15 via-blue-400/10 to-teal-300/10 blur-3xl"
      />

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            Neuroscience-Backed Routine Architecture
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-tight">
            Flow — Activity Planner
          </h1>

          <p className="mt-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Break Inertia.{' '}
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-teal-500 bg-clip-text text-transparent">
              Build Momentum.
            </span>{' '}
            Flow.
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            The anti-procrastination activity planner designed to defeat executive dysfunction.
            Replace rigid, anxiety-inducing 24-hour timeblocking with 3 Circadian Anchor Routines
            and an instant 2-to-5 minute panic activation action.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg sm:w-auto"
            >
              Enter Application
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-8 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground sm:w-auto"
            >
              Sign In with Google / Email
            </Link>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Invite-only &bull; Whitelisted access control &bull; Zero paid billing dependencies
          </p>
        </div>
      </section>

      {/* 3 Daily Anchor Routines Showcase */}
      <section className="border-t border-border bg-card/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              3 Daily Anchor Routines
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Circadian scaffolding that adapts to energy levels instead of rigid calendar hours.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Anchor 1: Morning Launchpad */}
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-amber-400/50 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-xl font-bold text-amber-500">
                🌅
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                1. Morning Launchpad
              </h3>
              <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                Low-Friction Awakening &amp; Clarity
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Hydration check, 1-5 energy assessment, and selection of your Single Keystone Focus
                plus up to 2 secondary tasks (Rule of 3).
              </p>
              <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Key Ritual:</span> Energy Check-In &amp; Keystone Commitment.
              </div>
            </div>

            {/* Anchor 2: Day Momentum Block */}
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-indigo-400/50 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl font-bold text-indigo-500">
                ⚡
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                2. Day Momentum Block
              </h3>
              <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Focus Sprints &amp; Flow State
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Single-task focus view, Pomodoro sprint pacing, real-time logging, and one-tap access
                to the panic button if executive paralysis strikes.
              </p>
              <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Key Ritual:</span> 25-Min Focus Sprint &amp; Distraction Shield.
              </div>
            </div>

            {/* Anchor 3: Evening Shutdown */}
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-teal-400/50 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-xl font-bold text-teal-500">
                🌙
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                3. Evening Shutdown
              </h3>
              <p className="mt-1 text-xs font-medium text-teal-600 dark:text-teal-400">
                Zeigarnik Loop Closure &amp; Rest
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Celebrate micro-wins, defer remaining items guilt-free to tomorrow, set tomorrow&apos;s
                anchor, and formally shut down mental work loops.
              </p>
              <div className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Key Ritual:</span> Guilt-Free Deferral &amp; Shutdown Complete.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "Unstick Me" Panic Button Showcase */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-500/5 via-card to-card p-8 sm:p-12">
            <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
              <div className="max-w-xl text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <span>🚨</span> Inertia-Breaking Panic Action
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Paralyzed by Overwhelm? Press &quot;Unstick Me&quot;.
                </h2>
                <p className="mt-3 text-base text-muted-foreground">
                  When you cannot start, planning is your enemy. The panic action bypasses your schedule
                  and gives you exactly ONE 2-to-5 minute somatic or atomic action to get your hands moving.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">&check;</span> Deterministic 30+ neuroscience micro-activation catalog (&lt;10ms latency).
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">&check;</span> Optional Free-Tier Gemini 1.5 Flash AI integration with circuit breaker.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500">&check;</span> Circular countdown timer with zero guilt.
                  </li>
                </ul>
              </div>

              {/* Mock Panic Activation Card */}
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-semibold tracking-wide uppercase text-rose-500">
                    Sample Activation Task
                  </span>
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    180 Seconds
                  </span>
                </div>
                <h4 className="mt-3 text-base font-bold text-foreground">
                  The Cold Water &amp; Shoulder Roll Reset
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  &quot;Stand up immediately. Walk to the sink, pour a full glass of cold water, drink it in 5 slow sips, and do 10 backward shoulder rolls.&quot;
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Category: Physical Somatic</span>
                  <Link
                    href="/dashboard"
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition-colors hover:bg-rose-600"
                  >
                    Try in App &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Access Banner */}
      <section className="border-t border-border bg-card/60 py-12">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h3 className="text-base font-semibold text-foreground">
            Whitelisted Access &amp; Zero Paid Infrastructure
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Strict server-side route guards intercept unauthenticated visitors before any private UI or data leaks.
            Runs 100% on Netlify Free Tier, Supabase PostgreSQL, and Google OAuth under the verified buildnest.buzz project umbrella.
          </p>
        </div>
      </section>
    </div>
  );
}
