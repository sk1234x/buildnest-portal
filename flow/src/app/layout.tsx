import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Flow — Authenticated Activity Planner',
    template: '%s | Flow',
  },
  description:
    'Overcome procrastination and executive dysfunction paralysis with 3 Daily Anchor Routines and instant 2-to-5 minute Unstick Me micro-activations.',
  applicationName: 'Flow',
  authors: [{ name: 'BuildNest Team', url: 'https://buildnest.buzz' }],
  keywords: [
    'activity planner',
    'routine',
    'procrastination',
    'executive dysfunction',
    'anchor routines',
    'unstick me',
    'flow',
    'adhd tools',
  ],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
        {/* WCAG Skip-to-content accessible link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-md"
        >
          Skip to main content
        </a>

        {/* Global Navigation Header */}
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/" className="group flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-blue-400 font-bold text-white shadow-sm transition-transform group-hover:scale-105">
                  ⚡
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-foreground">
                    Flow
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    by BuildNest
                  </span>
                </div>
              </Link>

              <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary sm:inline-flex">
                Free-Tier Prototype
              </span>
            </div>

            <nav className="flex items-center gap-3" aria-label="Main navigation">
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow"
              >
                Launch Planner
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-border bg-card py-8 text-sm text-muted-foreground">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <p className="font-medium text-foreground">
                Flow &copy; {new Date().getFullYear()} BuildNest
              </p>
              <p className="text-xs">
                Hosted on Netlify Free Tier &bull; PostgreSQL via Supabase &bull; Custom Domain flow.buildnest.buzz
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <a
                href="https://buildnest.buzz/privacy.html"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground hover:underline"
              >
                Privacy Policy
              </a>
              <a
                href="https://buildnest.buzz/terms.html"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground hover:underline"
              >
                Terms of Service
              </a>
              <a
                href="https://buildnest.buzz"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground hover:underline"
              >
                BuildNest Portal
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
