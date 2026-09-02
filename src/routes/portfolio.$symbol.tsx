import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { AssetIcon } from "@/components/asset-icon";
import { portfolioHistory } from "@/lib/mock-data";
import { computeMetrics, portfolioActions, portfolioSummary, usePortfolioData, assetCurrency, normalizeToUSD } from "@/lib/portfolio-store";
import { usd, pct, num } from "@/lib/format";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { useState, useEffect, useMemo } from "react";
import { marketApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useLiveTicker } from "@/hooks/use-live-ticker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portfolio/$symbol")({
  head: ({ params }) => ({ meta: [{ title: `${params.symbol} — Folio` }] }),
  component: AssetDetail,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <div className="flex-1 grid place-items-center p-12 text-center">
        <div>
          <h1 className="font-display text-3xl">Asset not found</h1>
          <Link to="/portfolio" className="mt-3 inline-block text-primary hover:underline">← Back to portfolio</Link>
        </div>
      </div>
    </div>
  ),
});

function AssetDetail() {
  const { symbol } = Route.useParams();
  const { holdings, watchlist, activity } = usePortfolioData();
  
  // Find holding if user owns it
  const h = holdings.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase());
  // Find in watchlist if user has it watched
  const w = watchlist.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase());

  const currency = assetCurrency(symbol, (h as any)?.currency ?? (w as any)?.currency);

  const [liveQuote, setLiveQuote] = useState<{ price: number; changePercent: number } | null>(null);
  const [news, setNews] = useState<Array<{ title: string; link: string; source: string; pubDate: string }>>([]);
  const [loadingNews, setLoadingNews] = useState(false);

  const assetName = h?.name ?? w?.name ?? symbol;
  const assetType = h?.type ?? w?.type ?? "stock";
  const sector = h?.sector ?? "Market Asset";
  const color = h?.color ?? w?.color ?? "var(--color-primary)";

  const initialPrice = h?.currentPrice ?? w?.price ?? 0;
  const initialChange = h?.dayChangePct ?? w?.change ?? 0;

  // Use live socket streaming
  const { price, changePercent, direction } = useLiveTicker(
    symbol,
    assetType,
    liveQuote?.price || initialPrice || 100,
    liveQuote?.changePercent !== undefined ? liveQuote.changePercent : initialChange
  );

  // Extract variables for calculations if holdings exist
  const avgPrice = h?.avgPrice ?? 0;
  const quantity = h?.quantity ?? 0;
  const notesValue = h?.notes ?? "";
  const purchaseDate = h?.purchaseDate ?? new Date().toISOString().slice(0, 10);

  const m = useMemo(() => {
    if (!h) return { value: 0, invested: 0, pl: 0, plPct: 0 };
    const value = quantity * price;
    const invested = quantity * avgPrice;
    const pl = value - invested;
    const plPct = invested > 0 ? (pl / invested) * 100 : 0;
    return { value, invested, pl, plPct };
  }, [h, quantity, avgPrice, price]);

  const s = portfolioSummary(holdings);
  const allocation = s.value > 0 ? (normalizeToUSD(m.value, currency) / s.value) * 100 : 0;

  const [range, setRange] = useState<"1D" | "1M" | "3M" | "6M" | "1Y">("6M");
  const days = { "1D": 1, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[range];
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chartMode, setChartMode] = useState<"price" | "value">("price");

  // Fetch quote, history and news on symbol change
  useEffect(() => {
    let cancelled = false;

    async function fetchAssetHistory() {
      setLoadingHistory(true);
      try {
        const res = await marketApi.history(symbol, days);
        if (cancelled) return;

        const pts = res.history.map((pt) => {
          const d = new Date(pt.timestamp);
          const dateStr = days <= 1
            ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : d.toISOString().slice(0, 10);
          return {
            date: dateStr,
            value: pt.price,
          };
        });

        setChartData(pts);
      } catch (err) {
        console.error(`Failed to fetch history for ${symbol}:`, err);
        // Fallback to mock data if API fails
        const fallback = portfolioHistory(days, (price || 100) * 100).map((d) => ({
          date: d.date,
          value: d.value / 100,
        }));
        setChartData(fallback);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    async function fetchQuoteAndNews() {
      // 1. Fetch live quote
      try {
        const q = await marketApi.quote(symbol);
        if (cancelled) return;
        setLiveQuote({
          price: q.price,
          changePercent: q.changePercent,
        });
      } catch (err) {
        console.error(`Failed to fetch quote for ${symbol}:`, err);
      }

      // 2. Fetch real news articles from our new backend news scraper
      setLoadingNews(true);
      try {
        const res = await marketApi.news(assetName || symbol);
        if (cancelled) return;
        setNews(res.news);
      } catch (err) {
        console.error(`Failed to fetch news for query "${assetName}":`, err);
      } finally {
        if (!cancelled) setLoadingNews(false);
      }
    }

    fetchAssetHistory();
    fetchQuoteAndNews();

    return () => {
      cancelled = true;
    };
  }, [symbol, days, assetName]);

  // Dynamically map data points based on mode selection
  const displayData = useMemo(() => {
    return chartData.map((pt) => ({
      date: pt.date,
      value: chartMode === "value" && h ? pt.value * quantity : pt.value,
    }));
  }, [chartData, chartMode, quantity, h]);

  const firstVal = displayData[0]?.value ?? 0;
  const lastVal = displayData[displayData.length - 1]?.value ?? 0;
  const changeVal = lastVal - firstVal;
  const changePct = firstVal !== 0 ? (changeVal / firstVal) * 100 : 0;
  const isGreen = changeVal >= 0;

  // Calculate reference line values based on mode
  const referenceY = chartMode === "value" ? avgPrice * quantity : avgPrice;
  const referenceLabel = chartMode === "value" ? `Invested: ${usd(avgPrice * quantity, { fromCurrency: currency })}` : `Buy Price: ${usd(avgPrice, { fromCurrency: currency })}`;

  const bars = Array.from({ length: 30 }, (_, i) => ({
    d: `D${i+1}`,
    v: Math.round(Math.sin(i * 0.5) * 20 + (i % 4 === 0 ? -15 : 25)),
  }));

  // Purchase history using real user transaction activity
  const assetTransactions = useMemo(() => {
    return (activity || []).filter((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
  }, [activity, symbol]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 space-y-6">
        <Link to="/portfolio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to portfolio
        </Link>

        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <AssetIcon symbol={symbol} color={color} className="h-14 w-14 text-base" />
            <div className="min-w-0">
              <h1 className="font-display text-3xl text-navy truncate">{assetName}</h1>
              <div className="text-sm text-muted-foreground">{symbol} · <span className="capitalize">{assetType}</span> · {sector}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-semibold num">
              <span
                className={cn(
                  "transition-colors duration-500 rounded px-1.5 py-0.5",
                  direction === "up" && "bg-gain/20 text-gain font-medium",
                  direction === "down" && "bg-loss/20 text-loss font-medium"
                )}
              >
                {usd(price, { fromCurrency: currency })}
              </span>
            </div>
            <div className={`text-sm font-medium num mt-0.5 ${changePercent >= 0 ? "text-gain" : "text-loss"}`}>
              {changePercent >= 0 ? "+" : ""}{pct(changePercent)} today
            </div>
          </div>
        </header>

        {h ? (
          /* Portfolio KPI Cards */
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Your holdings" value={`${num(quantity, 4)} ${symbol}`} sub={usd(m.value, { fromCurrency: currency, maximumFractionDigits: 0 })} />
            <Kpi label="Profit / loss" value={`${m.pl >= 0 ? "+" : ""}${usd(m.pl, { fromCurrency: currency, maximumFractionDigits: 0 })}`} sub={pct(m.plPct)} positive={m.pl >= 0} />
            <Kpi label="Avg buy price" value={usd(avgPrice, { fromCurrency: currency })} sub={`Invested ${usd(m.invested, { fromCurrency: currency, maximumFractionDigits: 0 })}`} />
            <Kpi label="Portfolio allocation" value={`${allocation.toFixed(1)}%`} sub="of total value" />
          </div>
        ) : (
          /* Not Owned Banner with instant add holding action */
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[var(--shadow-card)]">
            <div>
              <h3 className="font-semibold text-lg text-navy">You don't own this asset yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Add it to your portfolio holdings to track its performance, buy history, and average cost.</p>
            </div>
            <Button
              className="rounded-full shrink-0 gap-1.5"
              onClick={() => {
                portfolioActions.addHolding({
                  symbol: symbol.toUpperCase(),
                  name: assetName,
                  type: assetType as any,
                  quantity: 1,
                  avgPrice: price,
                  currentPrice: price,
                  purchaseDate: new Date().toISOString().slice(0, 10),
                });
                toast.success(`${symbol.toUpperCase()} added to portfolio holdings`);
              }}
            >
              <Plus className="h-4 w-4" /> Add to portfolio
            </Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-medium text-navy">Price history</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    Real-time quotes and historical data
                  </span>
                  {displayData.length > 0 && !loadingHistory && (
                    <span className={`text-xs font-semibold ${isGreen ? "text-gain" : "text-loss"}`}>
                      ({isGreen ? "+" : ""}{usd(changeVal, { fromCurrency: currency })} / {isGreen ? "+" : ""}{pct(changePct)})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Mode toggle — only show if holding exists */}
                {h && (
                  <div className="flex gap-1 rounded-md bg-secondary p-1">
                    <button
                      onClick={() => setChartMode("price")}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${chartMode === "price" ? "bg-card shadow-sm font-medium text-navy" : "text-muted-foreground"}`}
                    >
                      Asset Price
                    </button>
                    <button
                      onClick={() => setChartMode("value")}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${chartMode === "value" ? "bg-card shadow-sm font-medium text-navy" : "text-muted-foreground"}`}
                    >
                      Holding Value
                    </button>
                  </div>
                )}
                {/* Range selectors */}
                <div className="flex gap-1 rounded-md bg-secondary p-1">
                  {(["1D", "1M", "3M", "6M", "1Y"] as const).map((r) => (
                    <button key={r} onClick={() => setRange(r)} className={`px-2.5 py-1 text-xs rounded ${range===r ? "bg-card shadow-sm font-medium text-navy" : "text-muted-foreground"}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="h-80 p-3">
              {loadingHistory ? (
                <div className="h-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading price history…
                </div>
              ) : displayData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No historical data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={displayData}>
                    <defs>
                      <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isGreen ? "var(--color-success)" : "var(--color-loss)"} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={isGreen ? "var(--color-success)" : "var(--color-loss)"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={50} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => usd(v as number, { fromCurrency: currency, maximumFractionDigits: 0 })} domain={['auto','auto']} />
                    <Tooltip 
                      contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} 
                      formatter={(v: any) => [usd(v, { fromCurrency: currency }), chartMode === "value" ? "Holding Value" : "Price"]} 
                    />
                    <Area type="monotone" dataKey="value" stroke={isGreen ? "var(--color-success)" : "var(--color-loss)"} strokeWidth={2} fill="url(#aG)" />
                    {/* Dashed horizontal cost basis line — only if holding exists */}
                    {h && referenceY > 0 && (
                      <ReferenceLine
                        y={referenceY}
                        stroke="var(--color-muted-foreground)"
                        strokeDasharray="4 4"
                        label={{
                          value: referenceLabel,
                          fill: "var(--color-muted-foreground)",
                          fontSize: 10,
                          position: "top",
                        }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-medium text-navy">Daily volatility</h3>
              <p className="text-xs text-muted-foreground">30-day range</p>
            </div>
            <div className="h-80 p-3">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={bars}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }}
                  />
                  <Bar dataKey="v" radius={[3,3,0,0]} fill="var(--color-chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {h && (
          /* Transaction and Personal Notes Grid — only render if user owns the holding */
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border"><h3 className="font-medium text-navy">Position Transaction History</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[550px]">
                  <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-5 py-3">Date</th>
                      <th className="text-left font-medium px-5 py-3">Type</th>
                      <th className="text-right font-medium px-5 py-3">Quantity</th>
                      <th className="text-right font-medium px-5 py-3">Price</th>
                      <th className="text-right font-medium px-5 py-3">Total</th>
                      <th className="text-left font-medium px-5 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-sm">
                          No transaction history available.
                        </td>
                      </tr>
                    ) : (
                      assetTransactions.map((t, i) => (
                        <tr key={t.id || i} className="border-t border-border">
                          <td className="px-5 py-4">{new Date(t.timestamp).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              t.type === "Buy" ? "bg-success/10 text-success" :
                              t.type === "Sell" ? "bg-loss/10 text-loss" :
                              t.type === "Update" ? "bg-primary/10 text-primary" :
                              "bg-accent text-accent-foreground"
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right num">{num(t.amount, 4)}</td>
                          <td className="px-5 py-4 text-right num">{usd(t.price, { fromCurrency: currency })}</td>
                          <td className="px-5 py-4 text-right num">{usd(t.amount * t.price, { fromCurrency: currency })}</td>
                          <td className="px-5 py-4 text-left text-xs text-muted-foreground max-w-[200px] truncate" title={t.notes || ""}>
                            {t.notes || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-medium text-navy">Notes</h3>
              <p className="text-xs text-muted-foreground mt-1">Personal context about this position.</p>
              <textarea
                className="mt-4 w-full min-h-[140px] rounded-lg border border-border bg-surface-muted p-3 text-sm outline-none focus:border-primary text-foreground"
                value={notesValue}
                onChange={(event) => {
                  portfolioActions.updateHolding(h.id, {
                    symbol,
                    name: assetName,
                    type: assetType,
                    quantity,
                    avgPrice,
                    currentPrice: price,
                    purchaseDate,
                    notes: event.target.value,
                  });
                }}
                onBlur={() => toast.success("Notes saved")}
              />
            </div>
          </div>
        )}

        {/* Real Dynamic News Scraped Section */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-medium text-navy">Recent news for {assetName}</h3>
          </div>
          {loadingNews ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Scraping latest news articles...
            </div>
          ) : news.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No recent news found for {assetName}.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {news.map((n, i) => (
                <li key={i} className="hover:bg-secondary/40 transition-colors">
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="px-5 py-4 flex items-center gap-4 w-full">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-navy hover:text-primary transition-colors line-clamp-2 md:line-clamp-1">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{n.source} · {n.pubDate}</div>
                    </div>
                    <span className="text-xs text-primary font-medium shrink-0">Read →</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-xl font-semibold num ${positive === undefined ? "text-navy" : positive ? "text-gain" : "text-loss"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 num">{sub}</div>}
    </div>
  );
}
