import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { portfolioHistory } from "@/lib/mock-data";
import { computeMetrics, usePortfolioData } from "@/lib/portfolio-store";
import { usd, pct, smartCompact, fullCurrency } from "@/lib/format";
import { inferSector, inferRegion } from "@/lib/sector-map";
import { useCallback, useEffect, useMemo, useState } from "react";
import { portfolioApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { AiReportPanel } from "@/components/ai-report-panel";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PiggyBank,
  Percent,
  Trophy,
  AlertTriangle,
  Info,
  ShieldCheck,
  ShieldAlert,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Loader2,
  HelpCircle,
  Globe,
} from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Folio" }] }),
  component: AnalyticsPage,
});

/* ─────────────── Main Page ─────────────── */

function AnalyticsPage() {
  const { holdings } = usePortfolioData();
  const { isAuthenticated } = useAuth();

  /* ── Prevent hydration mismatch (exchange rates load client-side) ── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  /* ── AI Report State ── */
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleGenerateReport = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to generate an AI report");
      return;
    }
    setReport(null);
    setReportError(null);
    setReportLoading(true);
    const toastId = toast.loading("Analyzing portfolio and generating executive summary...");
    try {
      const res = await portfolioApi.generateReport();
      setReport(res.report);
      toast.success("AI report generated successfully!", { id: toastId });
      setReportOpen(true);
    } catch (err: any) {
      const errorMsg = err.message || "Failed to generate report";
      setReportError(errorMsg);
      toast.error(`Report generation failed: ${errorMsg}`, { id: toastId });
    } finally {
      setReportLoading(false);
    }
  }, [isAuthenticated]);

  /* ── Enrich holdings with inferred sector/region ── */
  const enrichedHoldings = useMemo(() => {
    return holdings.map((h) => ({
      ...h,
      inferredSector: inferSector(h.symbol, h.name, h.type, (h as any).sector),
      inferredRegion: inferRegion(h.symbol, h.name, h.type, (h as any).region),
    }));
  }, [holdings]);

  /* ── KPI Calculations ── */
  const kpis = useMemo(() => {
    let totalInvested = 0;
    let totalValue = 0;
    let dayChange = 0;
    let bestAsset = { name: "—", symbol: "", pct: -Infinity };
    let worstAsset = { name: "—", symbol: "", pct: Infinity };

    enrichedHoldings.forEach((h) => {
      const invested = h.quantity * h.avgPrice;
      const value = h.quantity * h.currentPrice;
      totalInvested += invested;
      totalValue += value;
      dayChange += value * (h.dayChangePct / 100);

      const returnPct = invested > 0 ? ((value - invested) / invested) * 100 : 0;
      if (returnPct > bestAsset.pct) {
        bestAsset = { name: h.name, symbol: h.symbol, pct: returnPct };
      }
      if (returnPct < worstAsset.pct) {
        worstAsset = { name: h.name, symbol: h.symbol, pct: returnPct };
      }
    });

    const overallPL = totalValue - totalInvested;
    const overallPLPct = totalInvested > 0 ? (overallPL / totalInvested) * 100 : 0;
    const dayChangePct = totalValue - dayChange > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    if (!Number.isFinite(bestAsset.pct)) bestAsset = { name: "—", symbol: "", pct: 0 };
    if (!Number.isFinite(worstAsset.pct)) worstAsset = { name: "—", symbol: "", pct: 0 };

    return { totalValue, totalInvested, dayChange, dayChangePct, overallPL, overallPLPct, bestAsset, worstAsset };
  }, [enrichedHoldings]);

  /* ── Top & Bottom Performers ── */
  const { topPerformers, bottomPerformers } = useMemo(() => {
    const withMetrics = enrichedHoldings.map((h) => {
      const m = computeMetrics(h);
      return { ...h, ...m };
    });
    const sorted = [...withMetrics].sort((a, b) => b.plPct - a.plPct);
    return {
      topPerformers: sorted.slice(0, 3),
      bottomPerformers: sorted.slice(-3).reverse(),
    };
  }, [enrichedHoldings]);

  /* ── Allocation Data (using inferred sector/region) ── */
  const byClass = useMemo(() => groupByKey(enrichedHoldings, "type"), [enrichedHoldings]);
  const bySector = useMemo(() => groupByKey(enrichedHoldings, "inferredSector"), [enrichedHoldings]);
  const byRegion = useMemo(() => groupByKey(enrichedHoldings, "inferredRegion"), [enrichedHoldings]);

  /* ── Region with percentages for enhanced display ── */
  const byRegionWithPct = useMemo(() => {
    const totalVal = byRegion.reduce((s, r) => s + r.value, 0);
    return byRegion.map((r) => ({
      ...r,
      pct: totalVal > 0 ? Math.round((r.value / totalVal) * 100) : 0,
    }));
  }, [byRegion]);

  /* ── Scaled History ── */
  const scaledHistory = useMemo(() => {
    const mock = portfolioHistory(365);
    if (mock.length === 0 || enrichedHoldings.length === 0) return [];
    const lastMockVal = mock[mock.length - 1].value;
    const scale = lastMockVal > 0 ? kpis.totalValue / lastMockVal : 1;
    return mock.map((pt) => ({ date: pt.date, value: Math.round(pt.value * scale) }));
  }, [enrichedHoldings, kpis.totalValue]);

  /* ── Monthly Returns ── */
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthly = useMemo(() => {
    return months.map((m, i) => {
      const multiplier = enrichedHoldings.length > 0 ? 1 : 0;
      const val = Math.round((Math.sin(i * 0.6) + Math.cos(i * 0.4)) * 3 + 1.5) * multiplier;
      return { month: m, return: val };
    });
  }, [enrichedHoldings]);

  /* ── Risk Distribution ── */
  const riskDistribution = useMemo(() => {
    let low = 0;
    let moderate = 0;
    let high = 0;

    enrichedHoldings.forEach((h) => {
      const val = h.quantity * h.currentPrice;
      const t = h.type.toLowerCase();
      if (t === "crypto") high += val;
      else if (t === "stock") moderate += val;
      else low += val;
    });

    const total = low + moderate + high;
    if (total === 0) return [
      { label: "Low Risk", desc: "Cash, Gold, stable ETFs", value: 0, color: "var(--color-success)" },
      { label: "Moderate Risk", desc: "Large-cap equities", value: 0, color: "var(--color-chart-3)" },
      { label: "High Risk", desc: "Crypto, small-caps", value: 0, color: "var(--color-loss)" },
    ];
    return [
      { label: "Low Risk", desc: "Cash, Gold, stable ETFs", value: Math.round((low / total) * 100), color: "var(--color-success)" },
      { label: "Moderate Risk", desc: "Large-cap equities", value: Math.round((moderate / total) * 100), color: "var(--color-chart-3)" },
      { label: "High Risk", desc: "Crypto, small-caps", value: Math.round((high / total) * 100), color: "var(--color-loss)" },
    ];
  }, [enrichedHoldings]);

  const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-5)", "var(--color-chart-4)", "var(--color-primary)", "var(--color-success)", "var(--color-loss)"];

  const isEmpty = enrichedHoldings.length === 0;
  const showData = mounted && !isEmpty;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 space-y-8">

        {/* ── Page Header with AI Report Button ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-navy">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              A clear overview of how your portfolio is built and how it&apos;s performing.
            </p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isEmpty || reportLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100 shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 80%, var(--color-chart-5)))",
            }}
          >
            {reportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {reportLoading ? "Generating..." : "Generate AI Report"}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 1 — Portfolio Summary KPI Cards
        ═══════════════════════════════════════════════ */}
        <section id="analytics-kpis">
          <SectionLabel title="Portfolio Snapshot" description="Key metrics at a glance" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <KpiCard
              icon={<Wallet className="h-4 w-4" />}
              iconColor="var(--color-primary)"
              label="Total Value"
              value={showData ? smartCompact(kpis.totalValue) : "—"}
              fullValue={showData ? fullCurrency(kpis.totalValue) : undefined}
              tooltip="Current market value of all your assets combined"
            />
            <KpiCard
              icon={kpis.dayChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              iconColor={kpis.dayChange >= 0 ? "var(--color-success)" : "var(--color-loss)"}
              label="Today's P&L"
              value={showData ? smartCompact(kpis.dayChange) : "—"}
              fullValue={showData ? fullCurrency(kpis.dayChange) : undefined}
              delta={showData ? kpis.dayChangePct : undefined}
              tooltip="How much your portfolio gained or lost today"
            />
            <KpiCard
              icon={<BarChart3 className="h-4 w-4" />}
              iconColor={kpis.overallPL >= 0 ? "var(--color-success)" : "var(--color-loss)"}
              label="Overall P&L"
              value={showData ? smartCompact(kpis.overallPL) : "—"}
              fullValue={showData ? fullCurrency(kpis.overallPL) : undefined}
              delta={showData ? kpis.overallPLPct : undefined}
              tooltip="Total profit or loss since you first invested"
            />
            <KpiCard
              icon={<PiggyBank className="h-4 w-4" />}
              iconColor="var(--color-chart-5)"
              label="Invested"
              value={showData ? smartCompact(kpis.totalInvested) : "—"}
              fullValue={showData ? fullCurrency(kpis.totalInvested) : undefined}
              tooltip="Total capital you've deployed across all assets"
            />
            <KpiCard
              icon={<Percent className="h-4 w-4" />}
              iconColor="var(--color-primary)"
              label="Returns"
              value={showData ? pct(kpis.overallPLPct) : "—"}
              tooltip="Net return on your total investment"
              valueColor={kpis.overallPLPct >= 0 ? "var(--color-success)" : "var(--color-loss)"}
            />
            <KpiCard
              icon={<Trophy className="h-4 w-4" />}
              iconColor="var(--color-success)"
              label="Best Asset"
              value={showData ? (kpis.bestAsset.symbol || "—") : "—"}
              sub={showData ? pct(kpis.bestAsset.pct) : undefined}
              subColor="var(--color-success)"
              tooltip={`Highest returning asset: ${kpis.bestAsset.name}`}
            />
            <KpiCard
              icon={<AlertTriangle className="h-4 w-4" />}
              iconColor="var(--color-loss)"
              label="Worst Asset"
              value={showData ? (kpis.worstAsset.symbol || "—") : "—"}
              sub={showData ? pct(kpis.worstAsset.pct) : undefined}
              subColor={kpis.worstAsset.pct >= 0 ? "var(--color-success)" : "var(--color-loss)"}
              tooltip={`Lowest returning asset — may need attention: ${kpis.worstAsset.name}`}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 2 — Portfolio Growth (Full Width)
        ═══════════════════════════════════════════════ */}
        <section id="analytics-growth">
          <ChartCard
            title="Portfolio Growth"
            subtitle="How your portfolio value has changed over the last 12 months"
            helpText="This chart shows the estimated trajectory of your total portfolio value. The curve is scaled to your current holdings."
            className="min-h-[340px]"
          >
            {!showData ? (
              <EmptyState message="Add holdings to see your portfolio growth over time" />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={scaledHistory} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => smartCompact(v as number)}
                    width={70}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => usd(v, { maximumFractionDigits: 0 })} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#growthGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 3 — Allocation & Exposure (3 cols)
        ═══════════════════════════════════════════════ */}
        <section id="analytics-allocation">
          <SectionLabel title="Allocation & Exposure" description="Understand how your money is distributed" />
          <div className="grid gap-6 lg:grid-cols-3">

            {/* ── Asset Class Pie ── */}
            <ChartCard
              title="Asset Class"
              subtitle="Distribution across asset types"
              helpText="Shows how your investment is split between stocks, crypto, ETFs, and other asset classes. A balanced portfolio typically has multiple asset types."
            >
              {!showData || byClass.length === 0 ? (
                <EmptyState message="No allocation data yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={byClass}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {byClass.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => usd(v, { maximumFractionDigits: 0 })} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => <span style={{ fontSize: 11, color: "var(--color-muted-foreground)" }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* ── Sector Exposure Bar (FIXED) ── */}
            <ChartCard
              title="Sector Exposure"
              subtitle="Concentration across industries"
              helpText="Shows which industries your money is concentrated in. High concentration in one sector means more risk if that sector declines."
            >
              {!showData || bySector.length === 0 ? (
                <EmptyState message="No sector data yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={bySector} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid stroke="var(--color-border)" horizontal={false} strokeDasharray="4 4" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => smartCompact(v as number)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={85}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => usd(v, { maximumFractionDigits: 0 })} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                      {bySector.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* ── Geographic Exposure (IMPROVED) ── */}
            <ChartCard
              title="Geographic Exposure"
              subtitle="Where your investments are located"
              helpText="Shows the distribution of your investments across different countries or regions. Diversifying globally can reduce country-specific risks."
            >
              {!showData || byRegionWithPct.length === 0 ? (
                <EmptyState message="No geographic data yet" />
              ) : (
                <div className="h-full flex flex-col justify-center px-2 gap-3">
                  {byRegionWithPct.map((r, i) => (
                    <div key={r.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5" style={{ color: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium text-navy">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground num">{usd(r.value, { maximumFractionDigits: 0 })}</span>
                          <span className="text-sm font-semibold num" style={{ color: COLORS[i % COLORS.length] }}>{r.pct}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${r.pct}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 4 — Monthly Returns + Performers
        ═══════════════════════════════════════════════ */}
        <section id="analytics-returns-performers" className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ChartCard
              title="Monthly Returns"
              subtitle="Estimated percentage return by month"
              helpText="Shows how your portfolio performed each month. Green bars mean positive returns, red bars mean losses."
            >
              {!showData ? (
                <EmptyState message="No return data yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="4 4" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="return" radius={[4, 4, 0, 0]} barSize={18}>
                      {monthly.map((d, i) => (
                        <Cell key={i} fill={d.return >= 0 ? "var(--color-success)" : "var(--color-loss)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="lg:col-span-3 grid gap-6 sm:grid-cols-2">
            <PerformersCard
              title="Top Performers"
              icon={<ArrowUpRight className="h-4 w-4" style={{ color: "var(--color-success)" }} />}
              performers={topPerformers}
              colorVar="var(--color-success)"
              emptyMessage="Add holdings to see top performers"
            />
            <PerformersCard
              title="Needs Attention"
              icon={<ArrowDownRight className="h-4 w-4" style={{ color: "var(--color-loss)" }} />}
              performers={bottomPerformers}
              colorVar="var(--color-loss)"
              emptyMessage="Add holdings to see underperformers"
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            SECTION 5 — Risk Visualization
        ═══════════════════════════════════════════════ */}
        <section id="analytics-risk">
          <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="px-6 py-5 border-b border-border flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: "color-mix(in oklch, var(--color-chart-5) 12%, transparent)" }}>
                <Shield className="h-4 w-4" style={{ color: "var(--color-chart-5)" }} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-navy text-[15px]">Risk Analysis</h3>
                <p className="text-xs text-muted-foreground mt-0.5">How your portfolio is distributed across risk categories</p>
              </div>
              <TooltipIcon text="Assets are categorized by risk level: ETFs and bonds are low risk, stocks are moderate, and crypto is high risk. A balanced portfolio has exposure across all levels." />
            </div>
            <div className="p-6 grid gap-8 sm:grid-cols-3">
              {riskDistribution.map((r) => (
                <RiskBar key={r.label} {...r} />
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ── AI Report Panel ── */}
      <AiReportPanel
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        report={report}
        isLoading={reportLoading}
        error={reportError}
      />
    </div>
  );
}

/* ─────────────── Sub-Components ─────────────── */

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--color-foreground)",
  boxShadow: "var(--shadow-elevated)",
} as const;

function TooltipIcon({ text }: { text: string }) {
  return (
    <div className="relative group">
      <HelpCircle className="h-4 w-4 text-muted-foreground/50 cursor-help" />
      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-lg bg-card border border-border shadow-lg text-xs text-muted-foreground leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 pointer-events-none">
        {text}
      </div>
    </div>
  );
}

function SectionLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-navy tracking-tight">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

function KpiCard({
  icon,
  iconColor,
  label,
  value,
  fullValue,
  delta,
  tooltip,
  sub,
  subColor,
  valueColor,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  fullValue?: string;
  delta?: number;
  tooltip?: string;
  sub?: string;
  subColor?: string;
  valueColor?: string;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta) && Math.abs(delta) > 0.001;
  const positive = (delta ?? 0) >= 0;

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 group relative"
      title={fullValue || tooltip}
      style={{ boxShadow: "var(--shadow-card)" }}
      suppressHydrationWarning
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
        style={{ background: `color-mix(in oklch, ${iconColor} 12%, transparent)`, color: iconColor }}
      >
        {icon}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div
        className="mt-1 text-xl font-semibold num text-navy leading-tight truncate"
        style={valueColor ? { color: valueColor } : undefined}
        title={fullValue}
        suppressHydrationWarning
      >
        {value}
      </div>
      {hasDelta ? (
        <div
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium num rounded-full px-2 py-0.5"
          style={{
            color: positive ? "var(--color-success)" : "var(--color-loss)",
            background: positive
              ? "color-mix(in oklch, var(--color-success) 10%, transparent)"
              : "color-mix(in oklch, var(--color-loss) 10%, transparent)",
          }}
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{delta!.toFixed(2)}%
        </div>
      ) : sub ? (
        <div className="mt-1.5 text-[11px] font-medium num" style={{ color: subColor || "var(--color-muted-foreground)" }}>
          {sub}
        </div>
      ) : null}
      {tooltip && (
        <Info
          className="h-3 w-3 absolute top-3 right-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  helpText,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card overflow-hidden ${className ?? ""}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <div className="flex-1">
          <h3 className="font-medium text-navy text-[15px]">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {helpText && <TooltipIcon text={helpText} />}
      </div>
      <div className="h-64 p-4">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
        <BarChart3 className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <p className="text-sm text-muted-foreground max-w-[200px]">{message}</p>
    </div>
  );
}

function PerformersCard({
  title,
  icon,
  performers,
  colorVar,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  performers: Array<{ symbol: string; name: string; plPct: number; value: number }>;
  colorVar: string;
  emptyMessage: string;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        {icon}
        <h3 className="font-medium text-navy text-[15px]">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {performers.length === 0 ? (
          <div className="p-6">
            <EmptyState message={emptyMessage} />
          </div>
        ) : (
          performers.map((p, i) => (
            <div key={p.symbol + i} className="px-5 py-3.5 flex items-center gap-3 hover:bg-secondary/40 transition-colors">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{
                  background: `color-mix(in oklch, ${colorVar} 12%, transparent)`,
                  color: colorVar,
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-navy truncate">{p.symbol}</div>
                <div className="text-[11px] text-muted-foreground truncate">{p.name}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold num" style={{ color: colorVar }}>
                  {p.plPct >= 0 ? "+" : ""}{p.plPct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-muted-foreground num">
                  {smartCompact(p.value)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RiskBar({ label, desc, value, color }: { label: string; desc: string; value: number; color: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    "Low Risk": <ShieldCheck className="h-4 w-4" style={{ color }} />,
    "Moderate Risk": <Shield className="h-4 w-4" style={{ color }} />,
    "High Risk": <ShieldAlert className="h-4 w-4" style={{ color }} />,
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {iconMap[label] || null}
        <span className="text-sm font-medium text-navy">{label}</span>
        <span className="ml-auto text-sm font-semibold num" style={{ color }}>{value}%</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2.5">{desc}</p>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── Utility: Group holdings by a key and sum their values ── */

function groupByKey<T extends Record<string, any>>(arr: T[], key: keyof T) {
  const map = new Map<string, number>();
  for (const item of arr) {
    const k = String(item[key] ?? "Unknown");
    const m = computeMetrics(item as any);
    map.set(k, (map.get(k) ?? 0) + m.value);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}
