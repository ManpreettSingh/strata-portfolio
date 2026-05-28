import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, LineChart, Layers, Sparkles, PieChart, RefreshCcw, Check, FileSpreadsheet } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { portfolioHistory } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Folio — One view of every investment you hold" },
      { name: "description", content: "Track your cryptocurrency holdings in a single, beautifully designed portfolio dashboard." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <Hero />
      <LogoStrip />
      <Features />
      <StatsBand />
      <Showcase />
      <Security />
      <Comparison />
      <Testimonials />
      <FAQ />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  const data = portfolioHistory(60).slice(-60);
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-[1400px] px-6 pt-20 pb-16 lg:pt-28 lg:pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Real-time NSE, BSE & crypto sync
          </div>
          <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl text-navy leading-[1.02]">
            One quiet view of <em className="text-primary">every investment</em> you hold.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            Folio brings your stocks, crypto, ETFs and mutual funds into a single, calm dashboard — so you can read your portfolio in seconds, not spreadsheets.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth/signup">
              <Button size="lg" className="rounded-full px-6">
                Start Tracking <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="rounded-full px-6">
                Explore Demo
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Free to start</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> No card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Read-only by default</span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary font-medium">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Bulk CSV/Excel importer now live!
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <div className="text-xs text-muted-foreground">Portfolio value</div>
                <div className="text-2xl font-semibold num tracking-tight text-navy">₹1,37,62,505.07</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">All time</div>
                <div className="text-sm font-medium text-gain num">+38.42%</div>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill="url(#heroGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
              {[
                { l: "Bitcoin", v: "62%", c: "var(--color-chart-1)" },
                { l: "Ethereum", v: "21%", c: "var(--color-chart-3)" },
                { l: "Altcoins", v: "17%", c: "var(--color-chart-2)" },
              ].map((s) => (
                <div key={s.l} className="px-5 py-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.c }} /> {s.l}
                  </div>
                  <div className="mt-1 text-lg font-semibold num text-navy">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute right-4 top-20 rounded-xl border border-border bg-card shadow-[var(--shadow-card)] px-4 py-3 hidden sm:block">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Today</div>
            <div className="text-sm font-semibold text-gain num">+₹1,07,231.54</div>
          </div>
          <div className="absolute left-4 bottom-20 rounded-xl border border-border bg-card shadow-[var(--shadow-card)] px-4 py-3 hidden sm:block">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Top mover</div>
            <div className="text-sm font-semibold num text-navy">RELIANCE <span className="text-gain">+2.45%</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoStrip() {
  const names = ["NSE", "BSE", "CoinGecko", "Zerodha", "Groww", "Binance"];
  return (
    <div className="border-y border-border bg-surface-muted/40">
      <div className="mx-auto max-w-[1400px] px-6 py-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-[11px]">Connects with</span>
        {names.map((n) => <span key={n} className="font-semibold">{n}</span>)}
      </div>
    </div>
  );
}

function Features() {
  const items = [
    { icon: FileSpreadsheet, title: "Bulk CSV/Excel Importer", body: "Upload your transaction ledger in seconds. Download our template, copy-paste your holdings, and import instantly." },
    { icon: Layers, title: "Unified asset tracking", body: "Stocks, crypto, ETFs, commodities and indices — one source of truth across every account." },
    { icon: RefreshCcw, title: "Real-time market values", body: "Live prices and intraday changes update silently in the background." },
    { icon: PieChart, title: "Allocation insights", body: "See exposure by asset class, sector and region with a single glance." },
    { icon: LineChart, title: "Performance analytics", body: "Returns, CAGR, win-rate and drawdowns calculated automatically." },
    { icon: Sparkles, title: "Diversification score", body: "A simple health score tells you when something needs rebalancing." },
  ];
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-24">
      <div className="max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Features</div>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl text-navy">Everything you need. Nothing you don't.</h2>
        <p className="mt-4 text-muted-foreground">A focused toolkit that respects your attention. No noisy widgets, no upsell.</p>
      </div>
      <div className="mt-12 grid gap-px bg-border rounded-2xl overflow-hidden border border-border md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="bg-card p-7 transition-colors hover:bg-surface-muted">
            <it.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 text-base font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsBand() {
  const kpis = [
    { l: "Total tracked value", v: "₹20,000 Cr+" },
    { l: "Active investors", v: "48,200" },
    { l: "Assets supported", v: "12,000+" },
    { l: "Average return shown", v: "+18.4%" },
  ];
  return (
    <section className="border-y border-border bg-navy text-background">
      <div className="mx-auto max-w-[1400px] px-6 py-14 grid gap-8 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l}>
            <div className="font-display text-4xl sm:text-5xl">{k.v}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.18em] text-background/60">{k.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Showcase() {
  const data = portfolioHistory(120);
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Growth · 4M</div>
            <div className="text-xl font-semibold num text-navy">₹1,37,62,505</div>
          </div>
          <div className="flex gap-1 text-xs">
            {["1D","1W","1M","3M","YTD","1Y","ALL"].map((t,i) => (
              <span key={t} className={`px-2 py-1 rounded-md ${i===3 ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{t}</span>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="showG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="var(--color-success)" strokeWidth={2} fill="url(#showG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Built for clarity</div>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl text-navy">A dashboard that quiets the noise.</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          We obsess over typography, alignment and color so your data feels less like a screen and more like a page. The result is a place you actually enjoy returning to.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {[
            "Tabular numerals for crisp, scannable values",
            "Muted color until something genuinely needs attention",
            "Keyboard-first search (⌘K) across your whole portfolio",
            "Light and dark themes designed in tandem",
          ].map((p) => (
            <li key={p} className="flex gap-3"><Check className="h-4 w-4 text-success mt-0.5 shrink-0" /><span>{p}</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-24">
      <div className="rounded-2xl border border-border bg-surface-muted/50 p-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h2 className="mt-4 font-display text-3xl text-navy">Security is the product.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Read-only connections, encryption in transit and at rest, and zero ad-tech. We make money from subscriptions, not your data.
          </p>
        </div>
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {[
            ["AES-256", "Encryption at rest"],
            ["TLS 1.3", "Transport security"],
            ["SOC 2", "Type II in progress"],
            ["Read-only", "No trading permissions"],
          ].map(([t, s]) => (
            <div key={t} className="bg-card p-5">
              <div className="font-semibold">{t}</div>
              <div className="text-xs text-muted-foreground mt-1">{s}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const rows = [
    ["Multiple crypto assets", true, false, true],
    ["Real-time prices", true, true, false],
    ["Allocation analytics", true, false, false],
    ["Read-only connections", true, false, true],
    ["Dark mode designed in tandem", true, false, false],
    ["No ads, no data resale", true, false, true],
  ] as const;
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-24">
      <div className="max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Comparison</div>
        <h2 className="mt-3 font-display text-4xl text-navy">How Folio compares.</h2>
      </div>
      <div className="mt-10 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-4">Capability</th>
              <th className="font-medium px-6 py-4">Folio</th>
              <th className="font-medium px-6 py-4">Broker app</th>
              <th className="font-medium px-6 py-4">Spreadsheet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-6 py-4">{r[0]}</td>
                {[r[1], r[2], r[3]].map((v, j) => (
                  <td key={j} className="px-6 py-4 text-center">
                    {v ? <Check className="inline h-4 w-4 text-success" /> : <span className="text-muted-foreground">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    { q: "Finally a tracker that doesn't look like a 2008 trading terminal. I check it every morning.", a: "Priya M.", r: "Software engineer" },
    { q: "I moved off three apps and a spreadsheet. The allocation view alone is worth it.", a: "Daniel R.", r: "Independent investor" },
    { q: "The typography on a finance app shouldn't matter this much, and yet — it really does.", a: "Marta L.", r: "Product designer" },
  ];
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-24">
      <div className="grid md:grid-cols-3 gap-5">
        {quotes.map((q) => (
          <figure key={q.a} className="rounded-2xl border border-border bg-card p-7">
            <blockquote className="text-[15px] leading-relaxed">"{q.q}"</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-semibold">{q.a.split(" ").map(s=>s[0]).join("")}</div>
              <div>
                <div className="text-sm font-medium">{q.a}</div>
                <div className="text-xs text-muted-foreground">{q.r}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    { q: "Is Folio free?", a: "Folio is free to start with a generous personal tier. Pro plans unlock unlimited connections and advanced analytics." },
    { q: "How are connections secured?", a: "We use read-only connections via established aggregators, with AES-256 at rest and TLS 1.3 in transit." },
    { q: "Can I manually add assets?", a: "Yes — you can add lots manually with cost basis, or import a CSV from any broker." },
    { q: "Does Folio support international markets?", a: "Folio supports US, UK, EU and major Asian markets. New venues are added regularly." },
  ];
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-24 grid lg:grid-cols-[1fr_1.4fr] gap-12">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">FAQ</div>
        <h2 className="mt-3 font-display text-4xl text-navy">Questions, answered.</h2>
        <p className="mt-4 text-muted-foreground">Still curious? Reach out — a real person will reply.</p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {qs.map((x) => (
          <details key={x.q} className="group py-5">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-medium">{x.q}</span>
              <span className="text-muted-foreground group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{x.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 pb-24">
      <div className="rounded-3xl border border-border bg-navy text-background px-8 py-14 sm:px-14 sm:py-20 text-center">
        <h2 className="font-display text-4xl sm:text-5xl">Start reading your portfolio<br/>like it was meant to be read.</h2>
        <p className="mt-4 text-background/70 max-w-xl mx-auto">Free forever for personal use. Two minutes to set up.</p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link to="/auth/signup">
            <Button size="lg" className="rounded-full bg-background text-navy hover:bg-background/90 px-6">Start Tracking</Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="rounded-full border-background/20 bg-transparent text-background hover:bg-background/10 px-6">Explore Demo</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
