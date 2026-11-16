import React from 'react';
import Link from 'next/link';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      {/* Protected Sub-Navigation Bar */}
      <nav className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/dashboard"
                className="text-xs font-bold tracking-tight text-foreground hover:text-primary transition"
              >
                ⚡ Flow Planner
              </Link>
              <div className="flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/routines/morning"
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition inline-flex items-center gap-1"
                >
                  <span>🌅</span> <span className="hidden sm:inline">Morning</span>
                </Link>
                <Link
                  href="/routines/momentum"
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition inline-flex items-center gap-1"
                >
                  <span>⚡</span> <span className="hidden sm:inline">Momentum</span>
                </Link>
                <Link
                  href="/routines/evening"
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition inline-flex items-center gap-1"
                >
                  <span>🌙</span> <span className="hidden sm:inline">Evening</span>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/unstick"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 hover:bg-amber-500/20 transition dark:text-amber-400"
                title="Bypass planning — instant 2-5 min micro-activation"
              >
                <span>⚡</span>
                <span className="hidden sm:inline">Unstick Me</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Protected Content */}
      <div>{children}</div>

      {/* Persistent Panic Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          href="/unstick"
          aria-label="Unstick Me Panic Button"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 hover:scale-105 active:scale-95 transition focus:outline-none focus:ring-4 focus:ring-amber-500/30"
          title="Bypass planning — instant 2-5 min micro-activation"
        >
          <span className="text-xl">⚡</span>
        </Link>
      </div>
    </div>
  );
}
