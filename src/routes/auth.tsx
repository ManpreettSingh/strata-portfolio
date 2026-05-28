import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block relative bg-navy text-background overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative h-full flex flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-background text-navy">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 17l5-5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display text-xl">Folio</span>
          </Link>
          <blockquote className="max-w-md">
            <p className="font-display text-3xl leading-snug">"The best portfolio tool I've used in a decade. It just gets out of the way."</p>
            <footer className="mt-4 text-sm text-background/70">— Daniel R., independent investor</footer>
          </blockquote>
          <div className="text-xs text-background/50">© {new Date().getFullYear()} Folio</div>
        </div>
      </div>

      <div className="flex flex-col">
        <header className="flex items-center justify-between p-6">
          <Link to="/" className="lg:hidden font-display text-xl text-navy">Folio</Link>
          <div className="ml-auto text-sm text-muted-foreground">
            {pathname.endsWith("/signin")
              ? <>New here? <Link to="/auth/signup" className="text-primary hover:underline">Create account</Link></>
              : <>Have an account? <Link to="/auth/signin" className="text-primary hover:underline">Sign in</Link></>}
          </div>
        </header>
        <div className="flex-1 grid place-items-center px-6 pb-10">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
