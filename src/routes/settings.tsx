import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { portfolioActions, usePortfolioData } from "@/lib/portfolio-store";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { BulkImport } from "@/components/bulk-import";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Folio" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { holdings, preferences } = usePortfolioData();
  const { user, isAuthenticated } = useAuth();
  const currency = preferences?.currency || "INR";
  const tz = preferences?.tz || "Asia/Kolkata";

  const setCurrency = (c: string) => {
    portfolioActions.setCurrency(c);
    toast.success(`Currency changed to ${c}`);
  };

  const setTz = (t: string) => {
    portfolioActions.setTz(t);
    toast.success(`Time zone changed to ${t}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
        <div>
          <h1 className="font-display text-4xl text-navy">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Tailor Folio to your preferences.</p>
        </div>

        <Section title="Profile" desc="Information shown across your account.">
          <Row label="Display name"><Input defaultValue={isAuthenticated && user ? user.name : "Guest"} disabled={!isAuthenticated} /></Row>
          <Row label="Email"><Input type="email" defaultValue={isAuthenticated && user ? user.email : "Not signed in"} disabled={!isAuthenticated} /></Row>
          {!isAuthenticated && (
            <div className="px-6 py-3 bg-surface-muted/30">
              <p className="text-xs text-muted-foreground">Sign in to edit your profile details.</p>
            </div>
          )}
        </Section>

        <Section title="Appearance" desc="Choose how Folio looks to you.">
          <Row label="Theme">
            <div className="inline-flex rounded-full border border-border bg-surface-muted p-1">
              {(["light", "dark"] as const).map((t) => {
                const active = theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { if (t !== theme) toggle(); }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-card text-foreground shadow-[var(--shadow-card)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    {t === "light" ? "Light" : "Dark"}
                  </button>
                );
              })}
            </div>
          </Row>

        </Section>

        <BulkImport />

        <Section title="Preferences" desc="Defaults applied to data and displays.">
          <Row label="Currency">
            <Select value={currency} onChange={setCurrency} options={["USD","EUR","GBP","JPY","INR"]} />
          </Row>
          <Row label="Time zone">
            <Select value={tz} onChange={setTz} options={["America/New_York","Europe/London","Asia/Kolkata","Asia/Singapore","Asia/Tokyo","Australia/Sydney"]} />
          </Row>
          <Row label="Notifications">
            <div className="space-y-2 text-sm">
              <Check label="Daily summary email" defaultChecked />
              <Check label="Price alerts" defaultChecked />
              <Check label="Weekly performance report" />
            </div>
          </Row>
        </Section>

        <Section title="Data" desc="Manage your account data.">
          <Row label="Export portfolio">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                const header = "symbol,name,type,quantity,average_price,current_price,purchase_date,notes";
                const rows = holdings.map((h) =>
                  [h.symbol, h.name, h.type, h.quantity, h.avgPrice, h.currentPrice, h.purchaseDate ?? "", h.notes ?? ""]
                    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
                    .join(","),
                );
                const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "folio-portfolio.csv";
                link.click();
                URL.revokeObjectURL(url);
                toast.success("Portfolio exported as CSV");
              }}
            >
              Export as CSV
            </Button>
          </Row>
          <Row label="Reset guest data" danger>
            <Button
              variant="outline"
              className="rounded-full border-loss text-loss hover:bg-loss/10 hover:text-loss"
              onClick={() => {
                portfolioActions.resetGuestData();
                toast.success("Guest data reset to defaults");
              }}
            >
              Reset data
            </Button>
          </Row>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="px-6 py-5 border-b border-border">
        <h2 className="font-medium">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, children, danger }: { label: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 px-6 py-5">
      <div className={`text-sm font-medium ${danger ? "text-loss" : ""}`}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full max-w-sm rounded-md border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-primary" />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full max-w-sm rounded-md border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-primary">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Check({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 rounded border-border accent-primary" />
      <span>{label}</span>
    </label>
  );
}
