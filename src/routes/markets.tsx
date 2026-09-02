import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { AssetIcon } from "@/components/asset-icon";
import { sparkline } from "@/lib/mock-data";
import { usePortfolioData, assetCurrency } from "@/lib/portfolio-store";
import { usd, pct } from "@/lib/format";
import { Line, LineChart, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/markets")({
  head: () => ({ meta: [{ title: "Markets — Folio" }] }),
  component: MarketsPage,
});

const indices = [
  { name: "Nifty 50", value: 24827.5, change: 0.34 },
  { name: "BSE Sensex", value: 81245.6, change: 0.28 },
  { name: "Bank Nifty", value: 51120.8, change: -0.12 },
  { name: "Nifty IT", value: 38420.45, change: 0.92 },
  { name: "Bitcoin", value: 67230, change: -1.12 },
  { name: "Gold (10g)", value: 76450, change: 0.55 },
];

function MarketsPage() {
  const { holdings, watchlist } = usePortfolioData();
  const all = [
    ...holdings.map((h) => ({ symbol: h.symbol, name: h.name, price: h.currentPrice, change: h.dayChangePct, color: h.color, currency: assetCurrency(h.symbol, (h as any).currency) })),
    ...watchlist.map((w) => ({ symbol: w.symbol, name: w.name, price: w.price, change: w.change, color: w.color, currency: assetCurrency(w.symbol, (w as any).currency) })),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 space-y-6">
        <div>
          <h1 className="font-display text-4xl text-navy">Markets</h1>
          <p className="text-sm text-muted-foreground mt-1">A snapshot of Indian indices and popular assets.</p>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {indices.map((i) => (
            <div key={i.name} className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-[var(--shadow-card)]">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{i.name}</div>
              <div className="mt-1.5 text-lg font-semibold num text-navy">{i.value.toLocaleString("en-IN")}</div>
              <div className={`mt-0.5 text-xs font-medium num ${i.change >= 0 ? "text-gain" : "text-loss"}`}>{pct(i.change)}</div>
            </div>
          ))}
        </div>


        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-medium text-navy">Popular assets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Asset</th>
                  <th className="text-right font-medium px-5 py-3">Price</th>
                  <th className="text-right font-medium px-5 py-3">24h</th>
                  <th className="text-right font-medium px-5 py-3 hidden md:table-cell">Trend</th>
                </tr>
              </thead>
              <tbody>
                {all.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      No assets to display. Add holdings or watchlist items to populate this view.
                    </td>
                  </tr>
                ) : (
                  all.map((a, i) => (
                    <tr key={a.symbol + i} className="border-t border-border hover:bg-secondary/40 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          to="/portfolio/$symbol"
                          params={{ symbol: a.symbol }}
                          className="flex items-center gap-3 group"
                        >
                          <AssetIcon symbol={a.symbol} color={a.color} className="h-7 w-7" />
                          <div className="min-w-0">
                            <div className="font-medium text-navy group-hover:text-primary transition-colors truncate">{a.name}</div>
                            <div className="text-xs text-muted-foreground">{a.symbol}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-right num">{usd(a.price, { fromCurrency: a.currency })}</td>
                      <td className={`px-5 py-4 text-right num font-medium ${a.change >= 0 ? "text-gain" : "text-loss"}`}>{pct(a.change)}</td>
                      <td className="px-5 py-4 text-right hidden md:table-cell">
                        <div className="h-8 w-28 ml-auto">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <LineChart data={sparkline(i + 3)}>
                              <Line dataKey="v" stroke={a.change >= 0 ? "var(--color-success)" : "var(--color-loss)"} strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
