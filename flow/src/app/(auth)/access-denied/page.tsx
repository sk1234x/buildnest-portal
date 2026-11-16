import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
        {/* Shield / Lock Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl font-bold text-amber-500">
          🛡️
        </div>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Invite-Only Access
        </h1>

        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left">
          <p className="text-sm font-medium text-foreground">
            Account Not Whitelisted
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Your Google or email account authenticated successfully, but this account has not been
            granted access to the <strong>Flow</strong> private preview yet.
          </p>
        </div>

        <div className="mt-6 space-y-3 text-xs text-muted-foreground text-left">
          <p className="font-semibold text-foreground">How to gain access:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Request an invite by emailing <a href="mailto:hello@buildnest.buzz" className="text-primary underline hover:text-primary/80">hello@buildnest.buzz</a>.</li>
            <li>If you were invited under an alternate address, sign in using that whitelisted email.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
          >
            Sign In with Different Account
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            Return to Home
          </Link>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          Protected by BuildNest Edge Gatekeeper &bull; Zero Private Data Emitted
        </p>
      </div>
    </div>
  );
}
