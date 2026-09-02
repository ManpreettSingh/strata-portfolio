import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { StatCard } from "@/components/stat-card";
import { AssetIcon } from "@/components/asset-icon";
import { recentActivity } from "@/lib/mock-data";
import { usePortfolioData, computeMetrics, portfolioActions, exchangeRates, assetCurrency, normalizeToUSD } from "@/lib/portfolio-store";
import { usd, compactUsd, pct, num } from "@/lib/format";
import { Wallet, TrendingUp, Activity, Layers, Award, Loader2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { marketApi, type HistoryPoint } from "@/lib/api-client";
import { livePriceSocket } from "@/lib/live-price-socket";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Folio" }] }),
  component: DashboardPage,
});

function useLiveHoldingsPrices(holdings: any[]) {
  const [liveData, setLiveData] = useState<Record<string, { price: number; changePercent: number }>>({});

  useEffect(() => {
    const targets = holdings.filter(h => h.type.toLowerCase() === "crypto" || h.type.toLowerCase() === "stock");
    if (targets.length === 0) return;

    const cleanups: (() => void)[] = [];

    targets.forEach((h) => {
      const clean = livePriceSocket.subscribe(h.symbol, h.type, (update) => {
        setLiveData((prev) => ({
          ...prev,
          [h.symbol.toUpperCase()]: {
            price: update.price,
            changePercent: update.changePercent,
          }
        }));
      });
      cleanups.push(clean);
    });

    return () => {
      cleanups.forEach((c) => c());
    };
  }, [holdings]);

  return liveData;
}

function DashboardPage() {
  const { holdings } = usePortfolioData();
  const { user } = useAuth();
  
  const livePrices = useLiveHoldingsPrices(holdings);

  const getLiveHoldingStats = (h: typeof holdings[number]) => {
    const live = livePrices[h.symbol.toUpperCase()];
    const price = live ? live.price : h.currentPrice;
    const dayChangePct = live ? live.changePercent : h.dayChangePct;
    return { price, dayChangePct };
  };

  const liveHoldings = useMemo(() => {
    return holdings.map((h) => {
      const { price, dayChangePct } = getLiveHoldingStats(h);
      const invested = h.quantity * h.avgPrice;
      const value = h.quantity * price;
      const pl = value - invested;
      const plPct = invested > 0 ? (pl / invested) * 100 : 0;
      
      return {
        ...h,
        currentPrice: price,
        dayChangePct,
        value,
        invested,
        pl,
        plPct,
      };
    });
  }, [holdings, livePrices]);

  const s = useMemo(() => {
    let invested = 0;
    let value = 0;
    let dayChange = 0;
    for (const h of liveHoldings) {
      invested += h.invested;
      value += h.value;
      dayChange += h.value * (h.dayChangePct / 100);
    }
    const totalPL = value - invested;
    const totalPLPct = invested > 0 ? (totalPL / invested) * 100 : 0;
    const dayChangePct = value - dayChange > 0 ? (dayChange / (value - dayChange)) * 100 : 0;
    return { invested, value, totalPL, totalPLPct, dayChange, dayChangePct, count: liveHoldings.length };
  }, [liveHoldings]);

  const sorted = useMemo(() => {
    return [...liveHoldings].sort((a, b) => {
      const curA = assetCurrency(a.symbol, (a as any).currency);
      const curB = assetCurrency(b.symbol, (b as any).currency);
      return normalizeToUSD(b.value, curB) - normalizeToUSD(a.value, curA);
    });
  }, [liveHoldings]);

  const best = useMemo(() => {
    return sorted.length > 0 ? [...sorted].sort((a, b) => b.plPct - a.plPct)[0] : null;
  }, [sorted]);

  const worst = useMemo(() => {
    return sorted.length > 0 ? [...sorted].sort((a, b) => a.plPct - b.plPct)[0] : null;
  }, [sorted]);

  const bestMetrics = best ? { plPct: best.plPct } : { plPct: 0 };
  const worstMetrics = worst ? { plPct: worst.plPct } : { plPct: 0 };

  // Compute greeting on client only to avoid SSR/CSR hydration mismatch
  const [timeGreeting, setTimeGreeting] = useState("Welcome");
  useEffect(() => {
    const hour = new Date().getHours();
    setTimeGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);
  const displayName = user ? user.name.split(" ")[0] : "Guest";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-4xl text-navy truncate">
              {timeGreeting}, {displayName}.
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's where your portfolio stands today.
            </p>
          </div>
          <button
            type="button"
            className="self-start sm:self-end text-xs font-medium text-muted-foreground hover:text-loss transition-colors underline-offset-4 hover:underline"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                window.confirm(
                  "Reset your portfolio? This removes all demo data so you can add your own holdings.",
                )
              ) {
                portfolioActions.clearGuestData();
                toast.success("Portfolio reset");
              }
            }}
          >
            Reset portfolio
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total value" value={usd(s.value, { maximumFractionDigits: 0 })} delta={s.dayChangePct} deltaLabel="today" icon={<Wallet className="h-4 w-4" />} />
          <StatCard label="Total profit" value={usd(s.totalPL, { maximumFractionDigits: 0 })} delta={s.totalPLPct} deltaLabel="all time" icon={<TrendingUp className="h-4 w-4" />} />
          <StatCard label="Best performer" value={best ? best.symbol : "—"} delta={best ? bestMetrics.plPct : undefined} deltaLabel={best ? best.name : "No assets yet"} icon={<Award className="h-4 w-4" />} />
          <StatCard label="Holdings" value={s.count} deltaLabel={s.count === 1 ? "1 asset tracked" : `${s.count} assets tracked`} icon={<Layers className="h-4 w-4" />} />
        </div>


        <div className="grid gap-6 lg:grid-cols-3">
          <GrowthChart />
          <AllocationChart />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <DailyBars />
          <HealthScore holdings={liveHoldings} />
          <TopMovers holdings={liveHoldings} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Top holdings</h3>
              <Link to="/portfolio" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            <div className="divide-y divide-border">
              {sorted.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No holdings found. Add some assets to get started.
                </div>
              ) : (
                sorted.slice(0, 6).map((h) => (
                  <TopHoldingRow key={h.id} h={h} />
                ))
              )}
            </div>
          </div>
          <ActivityFeed />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MiniStat label="Today's gain/loss" value={usd(s.dayChange, { maximumFractionDigits: 0 })} positive={s.dayChange >= 0} />
          <MiniStat label="Invested capital" value={compactUsd(s.invested)} positive={true} muted />
          <MiniStat label="Worst performer" value={worst ? `${worst.symbol} ${pct(worstMetrics.plPct)}` : "—"} positive={false} />
        </div>
      </main>
    </div>
  );
}

function TopHoldingRow({ h }: { h: any }) {
  const [prevVal, setPrevVal] = useState(h.value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (h.value > prevVal) {
      setDirection("up");
      const t = setTimeout(() => setDirection(null), 1000);
      return () => clearTimeout(t);
    } else if (h.value < prevVal) {
      setDirection("down");
      const t = setTimeout(() => setDirection(null), 1000);
      return () => clearTimeout(t);
    }
    setPrevVal(h.value);
  }, [h.value, prevVal]);

  return (
    <Link
      to="/portfolio/$symbol"
      params={{ symbol: h.symbol }}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/50 transition-colors"
    >
      <AssetIcon symbol={h.symbol} color={h.color} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{h.name}</div>
        <div className="text-xs text-muted-foreground">{h.symbol} · {h.type}</div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            "text-sm font-medium num transition-colors duration-500 rounded px-1 -mx-1",
            direction === "up" && "bg-gain/20 text-gain font-semibold",
            direction === "down" && "bg-loss/20 text-loss font-semibold"
          )}
        >
          {usd(h.value, { fromCurrency: h.currency })}
        </div>
        <div className={`text-xs num ${h.pl >= 0 ? "text-gain" : "text-loss"}`}>{pct(h.plPct)}</div>
      </div>
    </Link>
  );
}

function MiniStat({ label, value, positive, muted }: { label: string; value: string; positive: boolean; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold num ${muted ? "" : positive ? "text-gain" : "text-loss"}`}>{value}</div>
    </div>
  );
}

function GrowthChart() {
  const { holdings } = usePortfolioData();
  const [range, setRange] = useState<"1D" | "1M" | "3M" | "6M" | "1Y">("6M");
  const days = { "1D": 1, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[range];
  const [data, setData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);

  // Build a stable key from holdings symbols+quantities so we refetch when portfolio changes
  const holdingsKey = useMemo(
    () => holdings.map((h) => `${h.symbol}:${h.quantity}`).join(","),
    [holdings],
  );

  useEffect(() => {
    if (typeof window === "undefined" || holdings.length === 0) {
      setData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchHistory() {
      try {
        // Fetch price history for each unique symbol in parallel
        const uniqueSymbols = [...new Set(holdings.map((h) => h.symbol))];
        const results = await Promise.all(
          uniqueSymbols.map((sym) =>
            marketApi.history(sym, days).catch(() => ({ symbol: sym, days, history: [] })),
          ),
        );

        if (cancelled) return;

        // Build a map: symbol -> timestamps+prices
        const historyMap = new Map<string, Map<number, number>>();
        let allTimestamps = new Set<number>();

        for (const result of results) {
          const priceMap = new Map<number, number>();
          for (const point of result.history) {
            // Round to nearest hour for alignment
            const rounded = days <= 1
              ? Math.round(point.timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000)
              : Math.round(point.timestamp / (3600 * 1000)) * (3600 * 1000);
            priceMap.set(rounded, point.price);
            allTimestamps.add(rounded);
          }
          historyMap.set(result.symbol.toUpperCase(), priceMap);
        }

        // Sort timestamps
        const sorted = [...allTimestamps].sort((a, b) => a - b);

        // Sample to ~100 points max for chart performance
        const step = Math.max(1, Math.floor(sorted.length / 100));
        const sampled = sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1);

        // For each timestamp, compute total portfolio value
        const chartData = sampled.map((ts) => {
          let totalValue = 0;
          for (const h of holdings) {
            const priceMap = historyMap.get(h.symbol.toUpperCase());
            if (priceMap) {
              // Find closest timestamp
              const price = priceMap.get(ts) ?? findClosest(priceMap, ts);
              const assetCurrency = h.symbol.toUpperCase().endsWith(".NS") || h.symbol.toUpperCase().endsWith(".BO") ? "INR" : ((h as any).currency || "USD");
              const rate = exchangeRates[assetCurrency.toUpperCase()] ?? 1.0;
              totalValue += h.quantity * (price / rate);
            }
          }

          const d = new Date(ts);
          const dateStr = days <= 1
            ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : d.toISOString().slice(0, 10);

          return { date: dateStr, value: Math.round(totalValue) };
        });

        if (!cancelled) {
          setData(chartData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch portfolio history:", err);
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [days, holdingsKey]);

  return (
    <div className="rounded-xl border border-border bg-card lg:col-span-2 overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-medium">Portfolio growth</h3>
          <p className="text-xs text-muted-foreground">Real-time prices from CoinGecko</p>
        </div>
        <div className="flex gap-1 rounded-md bg-secondary p-1">
          {(["1D", "1M", "3M", "6M", "1Y"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-2.5 py-1 text-xs rounded ${range===r ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{r}</button>
          ))}
        </div>
      </div>
      <div className="h-72 p-3">
        {loading ? (
          <div className="h-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading price history…
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No data available. Add holdings to see portfolio growth.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="dashG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => compactUsd(v as number)} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} formatter={(v: any) => usd(v, { maximumFractionDigits: 0 })} />
              <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill="url(#dashG)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/** Find the closest price in a Map<timestamp, price> */
function findClosest(priceMap: Map<number, number>, target: number): number {
  let closest = 0;
  let minDist = Infinity;
  for (const [ts, price] of priceMap) {
    const dist = Math.abs(ts - target);
    if (dist < minDist) {
      minDist = dist;
      closest = price;
    }
  }
  return closest;
}

function AllocationChart() {
  const { holdings } = usePortfolioData();
  const byType = holdings.reduce<Record<string, number>>((acc, h) => {
    const m = computeMetrics(h);
    const cur = assetCurrency(h.symbol, (h as any).currency);
    acc[h.type] = (acc[h.type] ?? 0) + normalizeToUSD(m.value, cur);
    return acc;
  }, {});
  const data = Object.entries(byType).map(([k, v]) => ({ name: k.toUpperCase(), value: Math.round(v) }));
  const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-5)"];
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-medium">Allocation</h3>
        <p className="text-xs text-muted-foreground">By asset class</p>
      </div>
      <div className="p-5">
        {total === 0 ? (
          <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
            No assets to allocate.
          </div>
        ) : (
          <>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2} stroke="none" isAnimationActive={false}>
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} formatter={(v: any) => usd(v, { maximumFractionDigits: 0 })} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-2">
              {data.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1">{d.name}</span>
                  <span className="num text-muted-foreground">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function DailyBars() {
  const { holdings } = usePortfolioData();
  const [data, setData] = useState<{ d: string; v: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const holdingsKey = useMemo(
    () => holdings.map((h) => `${h.symbol}:${h.quantity}`).join(","),
    [holdings],
  );

  useEffect(() => {
    if (typeof window === "undefined" || holdings.length === 0) {
      setData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchDailyPL() {
      try {
        const uniqueSymbols = [...new Set(holdings.map((h) => h.symbol))];
        // Fetch 15 days of history to calculate 14 daily changes
        const results = await Promise.all(
          uniqueSymbols.map((sym) =>
            marketApi.history(sym, 15).catch(() => ({ symbol: sym, days: 15, history: [] as HistoryPoint[] })),
          ),
        );

        if (cancelled) return;

        // Build a map: symbol -> Map<dateStr, price>
        const historyMap = new Map<string, Map<string, number>>();
        const allDates = new Set<string>();

        for (const result of results) {
          const datePriceMap = new Map<string, number>();
          for (const point of result.history) {
            const dateStr = new Date(point.timestamp).toISOString().slice(0, 10);
            datePriceMap.set(dateStr, point.price);
            allDates.add(dateStr);
          }
          historyMap.set(result.symbol.toUpperCase(), datePriceMap);
        }

        // Sort dates chronologically
        const sortedDates = [...allDates].sort();

        if (sortedDates.length < 2) {
          setData([]);
          setLoading(false);
          return;
        }

        // Calculate portfolio value for each date
        const dailyValues = sortedDates.map((dateStr) => {
          let value = 0;
          for (const h of holdings) {
            const datePriceMap = historyMap.get(h.symbol.toUpperCase());
            if (datePriceMap) {
              let price = datePriceMap.get(dateStr);
              if (price === undefined) {
                // Find nearest date price
                let minDiff = Infinity;
                let closestPrice = h.currentPrice;
                const targetTime = new Date(dateStr).getTime();
                for (const [dStr, p] of datePriceMap.entries()) {
                  const diff = Math.abs(new Date(dStr).getTime() - targetTime);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestPrice = p;
                  }
                }
                price = closestPrice;
              }
              value += h.quantity * price;
            }
          }
          return { dateStr, value };
        });

        // Compute daily changes (value(t) - value(t-1))
        const plData: { d: string; v: number }[] = [];
        const startIdx = Math.max(1, dailyValues.length - 14);
        for (let i = startIdx; i < dailyValues.length; i++) {
          const change = dailyValues[i].value - dailyValues[i - 1].value;
          const dateObj = new Date(dailyValues[i].dateStr);
          const formattedDate = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
          
          plData.push({
            d: formattedDate,
            v: Math.round(change),
          });
        }

        if (!cancelled) {
          setData(plData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch daily P/L history:", err);
        if (!cancelled) setLoading(false);
      }
    }

    fetchDailyPL();
    return () => {
      cancelled = true;
    };
  }, [holdingsKey]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden lg:col-span-1">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-medium">Daily P/L</h3>
          <p className="text-xs text-muted-foreground">Last 14 sessions</p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="h-48 p-3">
        {holdings.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No holdings found.
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            {loading ? "Loading daily changes..." : "No historical data available."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={data}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={12} />
              <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => compactUsd(v as number)} width={48} />

              <Tooltip 
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }}
                formatter={(v: any) => [usd(v), "Daily P/L"]}
              />
              <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.v >= 0 ? "var(--color-success)" : "var(--color-loss)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function HealthScore({ holdings }: { holdings: ReturnType<typeof usePortfolioData>["holdings"] }) {
  const { diversification, riskBalance, liquidity, overall } = useMemo(() => {
    if (holdings.length === 0) {
      return { diversification: 0, riskBalance: 0, liquidity: 0, overall: 0 };
    }

    const metrics = holdings.map((h) => ({
      type: h.type,
      value: (() => {
        const m = computeMetrics(h);
        const cur = assetCurrency(h.symbol, (h as any).currency);
        return normalizeToUSD(m.value, cur);
      })(),
    }));
    const totalValue = metrics.reduce((sum, m) => sum + m.value, 0);

    if (totalValue === 0) {
      return { diversification: 50, riskBalance: 50, liquidity: 50, overall: 50 };
    }

    const weights = metrics.map((m) => m.value / totalValue);

    // 1. Diversification: Herfindahl-Hirschman Index (HHI)
    const hhi = weights.reduce((sum, w) => sum + w * w, 0);
    const diversification = Math.max(15, Math.round((1 - hhi) * 100 + (holdings.length > 1 ? 15 : 0)));
    const cappedDiversification = Math.min(98, diversification);

    // 2. Risk Balance: penalize heavy concentration in high-risk categories like crypto
    const cryptoWeight = metrics
      .filter((m) => m.type === "crypto")
      .reduce((sum, m) => sum + m.value, 0) / totalValue;
    const riskBalance = Math.max(25, Math.round(100 - cryptoWeight * 65));

    // 3. Liquidity: Crypto (98), Stocks (90), Mutual Funds/ETFs (85)
    const liquidity = Math.round(
      weights.reduce((sum, w, i) => {
        const type = holdings[i].type;
        const score = type === "crypto" ? 98 : type === "stock" ? 90 : 85;
        return sum + w * score;
      }, 0)
    );

    // 4. Overall Health Score
    const overall = Math.round(cappedDiversification * 0.4 + riskBalance * 0.3 + liquidity * 0.3);

    return {
      diversification: cappedDiversification,
      riskBalance,
      liquidity,
      overall,
    };
  }, [holdings]);

  const circ = 2 * Math.PI * 42;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-medium">Portfolio health</h3>
      <p className="text-xs text-muted-foreground">Diversification & risk balance</p>
      
      {holdings.length === 0 ? (
        <div className="h-28 flex items-center justify-center text-xs text-muted-foreground">
          Add assets to calculate health score.
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-5">
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="var(--color-secondary)" strokeWidth="8" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="var(--color-success)" strokeWidth="8" fill="none"
                strokeDasharray={circ} strokeDashoffset={circ - (circ * overall) / 100} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-2xl font-semibold num">{overall}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">/100</div>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2 text-sm">
            <Row label="Diversification" v={diversification} />
            <Row label="Risk balance" v={riskBalance} />
            <Row label="Liquidity" v={liquidity} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="num">{v}</span></div>
      <div className="mt-1 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-foreground/80" style={{ width: `${v}%` }} /></div>
    </div>
  );
}

function TopMovers({ holdings }: { holdings: any[] }) {
  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) => b.dayChangePct - a.dayChangePct);
  }, [holdings]);

  const movers = useMemo(() => {
    return sorted.length <= 5 
      ? sorted 
      : [...sorted.slice(0, 3), ...sorted.slice(-2).reverse()];
  }, [sorted]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-medium">Top movers</h3>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
      <ul className="divide-y divide-border">
        {movers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No assets found.
          </div>
        ) : (
          movers.map((h) => (
            <TopMoverRow key={h.id} h={h} />
          ))
        )}
      </ul>
    </div>
  );
}

function TopMoverRow({ h }: { h: any }) {
  const [prevPct, setPrevPct] = useState(h.dayChangePct);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (h.dayChangePct > prevPct) {
      setDirection("up");
      const t = setTimeout(() => setDirection(null), 1000);
      return () => clearTimeout(t);
    } else if (h.dayChangePct < prevPct) {
      setDirection("down");
      const t = setTimeout(() => setDirection(null), 1000);
      return () => clearTimeout(t);
    }
    setPrevPct(h.dayChangePct);
  }, [h.dayChangePct, prevPct]);

  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      <AssetIcon symbol={h.symbol} color={h.color} className="h-7 w-7" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{h.symbol}</div>
        <div className="text-xs text-muted-foreground truncate">{h.name}</div>
      </div>
      <div
        className={cn(
          "text-sm font-medium num transition-colors duration-500 rounded px-1 -mx-1",
          direction === "up" && "bg-gain/20 text-gain font-semibold",
          direction === "down" && "bg-loss/20 text-loss font-semibold",
          direction === null && (h.dayChangePct >= 0 ? "text-gain" : "text-loss")
        )}
      >
        {pct(h.dayChangePct)}
      </div>
    </li>
  );
}

function ActivityFeed() {
  const { activity } = usePortfolioData();
  const list = activity || [];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-medium">Recent activity</h3>
      </div>
      <ul className="divide-y divide-border">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No recent activity. Actions you perform will appear here.
          </div>
        ) : (
          list.slice(0, 6).map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                a.type === "Buy" ? "bg-success/10 text-success" :
                a.type === "Sell" ? "bg-loss/10 text-loss" :
                a.type === "Watchlist" ? "bg-primary/10 text-primary" :
                "bg-accent text-accent-foreground"
              }`}>{a.type[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm"><span className="font-medium">{a.type}</span> · {a.symbol}</div>
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const actCurrency = assetCurrency(a.symbol);
                    return a.type === "Watchlist" ? (
                      `Added to watchlist @ ${usd(a.price, { fromCurrency: actCurrency })} · ${formatTimeAgo(a.timestamp)}`
                    ) : a.type === "Update" ? (
                      `Details updated @ ${usd(a.price, { fromCurrency: actCurrency })} · ${formatTimeAgo(a.timestamp)}`
                    ) : (
                      `${num(a.amount, 4)} @ ${usd(a.price, { fromCurrency: actCurrency })} · ${formatTimeAgo(a.timestamp)}`
                    );
                  })()}
                </div>
              </div>
              <div className="text-sm num text-muted-foreground">
                {(() => {
                  const actCurrency = assetCurrency(a.symbol);
                  return a.type === "Watchlist" || a.type === "Update" ? "—" : usd(a.amount * a.price, { fromCurrency: actCurrency, maximumFractionDigits: 0 });
                })()}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return "Just now";
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}
