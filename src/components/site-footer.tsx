import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-24 bg-surface-muted/50">
      <div className="mx-auto max-w-[1400px] px-6 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-background">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 17l5-5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display text-xl text-navy">Folio</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            One unified view of your stocks, crypto, ETFs, and funds. Built for clarity.
          </p>
        </div>
        <FooterCol title="Product" links={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Portfolio", to: "/portfolio" },
          { label: "Analytics", to: "/analytics" },
          { label: "Watchlist", to: "/watchlist" },
        ]} />
        <FooterCol title="Company" links={[
          { label: "About", to: "/" },
          { label: "Careers", to: "/" },
          { label: "Press", to: "/" },
          { label: "Contact", to: "/" },
        ]} />
        <FooterCol title="Legal" links={[
          { label: "Privacy", to: "/" },
          { label: "Terms", to: "/" },
          { label: "Security", to: "/" },
          { label: "Disclosures", to: "/" },
        ]} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-5 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Folio. All data shown is for demonstration.</span>
          <span>Made with care for investors.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
