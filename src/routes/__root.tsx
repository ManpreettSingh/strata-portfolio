import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "../lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/use-auth";
import { portfolioActions, usePortfolioData } from "@/lib/portfolio-store";
import { Loader2 } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Folio — Cryptocurrency Portfolio Tracking" },
      { name: "description", content: "Track and manage your cryptocurrency holdings in one elegant, calm dashboard." },
      { property: "og:title", content: "Folio — Cryptocurrency Portfolio Tracking" },
      { property: "og:description", content: "Track and manage your cryptocurrency holdings in one elegant, calm dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Folio — Cryptocurrency Portfolio Tracking" },
      { name: "twitter:description", content: "Track and manage your cryptocurrency holdings in one elegant, calm dashboard." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bcef726d-1c3e-4989-af41-5c7332fe6915/id-preview-7515f52f--885a671d-76a0-4a2b-865e-c5d06803b7db.lovable.app-1782024401288.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bcef726d-1c3e-4989-af41-5c7332fe6915/id-preview-7515f52f--885a671d-76a0-4a2b-865e-c5d06803b7db.lovable.app-1782024401288.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var token = localStorage.getItem("folio.auth.token");
                  if (token) {
                    document.documentElement.classList.add("is-authenticated");
                  } else {
                    document.documentElement.classList.remove("is-authenticated");
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppLoading() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-background">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 17l5-5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Loading Folio...</span>
        </div>
      </div>
    </div>
  );
}

function AppSyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isMounted } = useAuth();
  const { isSyncing } = usePortfolioData();

  useEffect(() => {
    portfolioActions.syncWithBackend();
  }, [isAuthenticated]);

  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("folio.auth.token");

  // Show a full-screen loader to mask hydration mismatches and prevent
  // unauthenticated/guest data flashes while syncing.
  if (!isMounted) return <AppLoading />;
  if (hasToken && isSyncing) return <AppLoading />;

  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId="803761628869-bnlb2fuj84ggu1277pe5dd3onmu5lo69.apps.googleusercontent.com">
        <ThemeProvider>
          <AppSyncProvider>
            <Outlet />
            <Toaster richColors position="top-right" />
          </AppSyncProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
}
