import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Flow — Activity Planner',
    template: '%s | Flow',
  },
  description:
    'A calm, flexible space to structure your day, focus on what matters most, and find your steady momentum.',
  applicationName: 'Flow',
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

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-border bg-card/60 py-6 text-sm text-muted-foreground">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
            <p className="text-xs text-muted-foreground">
              Flow &copy; {new Date().getFullYear()} &bull; Simple, flexible daily planning.
            </p>

            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a
                href="https://buildnest.buzz/privacy.html"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground hover:underline transition"
              >
                Privacy Policy
              </a>
              <a
                href="https://buildnest.buzz/terms.html"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground hover:underline transition"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
