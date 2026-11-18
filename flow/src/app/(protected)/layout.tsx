import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { URLCleaner } from '@/components/URLCleaner';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      <URLCleaner />

      {/* Protected App Navigation Bar */}
      <nav className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-foreground hover:opacity-90 transition"
              >
                <BrandLogo className="h-6 w-6" />
                <span className="text-sm font-bold tracking-tight">Flow</span>
              </Link>

              <div className="hidden sm:flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
                >
                  Dashboard
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/unstick"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition dark:text-amber-400"
                title="Bypass planning — instant 2-5 min micro-activation"
              >
                <span>⚡</span>
                <span>Unstick Me</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Protected Content */}
      <div>{children}</div>

      {/* Persistent Quick Reset Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          href="/unstick"
          aria-label="Unstick Me Quick Reset"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 hover:scale-105 active:scale-95 transition focus:outline-none focus:ring-4 focus:ring-amber-500/30"
          title="Bypass planning — instant 2-5 min micro-activation"
        >
          <span className="text-xl">⚡</span>
        </Link>
      </div>
    </div>
  );
}
