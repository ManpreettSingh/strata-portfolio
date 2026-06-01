import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { AssetIcon } from "@/components/asset-icon";
import { computeMetrics, portfolioActions, usePortfolioData, currencyConfig, type HoldingInput, type StoredHolding } from "@/lib/portfolio-store";
import type { AssetType } from "@/lib/mock-data";
import { usd, pct, num } from "@/lib/format";
import { ArrowUpDown, Pencil, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { marketApi } from "@/lib/api-client";
import { useLiveTicker } from "@/hooks/use-live-ticker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — Folio" }] }),
  component: PortfolioLayout,
});

function PortfolioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/portfolio") return <Outlet />;
  return <PortfolioPage />;
}

type SortKey = "name" | "value" | "pl" | "plPct" | "qty";

function PortfolioPage() {
  const { holdings } = usePortfolioData();
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<"all" | "stock" | "crypto" | "etf" | "commodity" | "index">("all");
  const [editing, setEditing] = useState<StoredHolding | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  // Count holdings by type
  const holdingsCounts = useMemo(() => {
    const counts = { all: holdings.length, stock: 0, crypto: 0, etf: 0, commodity: 0, index: 0 };
    holdings.forEach(h => {
      if (h.type === "stock") counts.stock++;
      else if (h.type === "crypto") counts.crypto++;
      else if (h.type === "etf") counts.etf++;
      else if (h.type === "commodity") counts.commodity++;
      else if (h.type === "index") counts.index++;
    });
    return counts;
  }, [holdings]);

  const rows = useMemo(() => {
    const f = holdings.filter((h) => filter === "all" || h.type === filter);
    return [...f].sort((a, b) => {
      const ma = computeMetrics(a), mb = computeMetrics(b);
      const get = (h: typeof a, m: typeof ma) => ({ name: h.name, value: m.value, pl: m.pl, plPct: m.plPct, qty: h.quantity }[sortKey]);
      const av = get(a, ma), bv = get(b, mb);
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [sortKey, dir, filter, holdings]); // Fixed: Added holdings here

  const toggle = (k: SortKey) => {
    if (sortKey === k) setDir(dir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setDir("desc"); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-4xl text-navy">Portfolio</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and manage your investment holdings.</p>
          </div>
          <Button className="rounded-full shrink-0 self-start sm:self-end" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add holding
          </Button>
        </div>

        {/* Asset type segmented filter */}
        <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-border bg-surface-muted p-1 text-sm">
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")} count={holdingsCounts.all}>
            All
          </FilterTab>
          <FilterTab active={filter === "crypto"} onClick={() => setFilter("crypto")} count={holdingsCounts.crypto}>
            Crypto
          </FilterTab>
          <FilterTab active={filter === "stock"} onClick={() => setFilter("stock")} count={holdingsCounts.stock}>
            Stocks
          </FilterTab>
          <FilterTab active={filter === "etf"} onClick={() => setFilter("etf")} count={holdingsCounts.etf}>
            ETFs
          </FilterTab>
          <FilterTab active={filter === "commodity"} onClick={() => setFilter("commodity")} count={holdingsCounts.commodity}>
            Commodities
          </FilterTab>
          <FilterTab active={filter === "index"} onClick={() => setFilter("index")} count={holdingsCounts.index}>
            Indices
          </FilterTab>
        </div>


        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th onClick={() => toggle("name")} active={sortKey==="name"} dir={dir}>Asset</Th>
                  <Th align="right" onClick={() => toggle("qty")} active={sortKey==="qty"} dir={dir}>Quantity</Th>
                  <Th align="right">Avg buy</Th>
                  <Th align="right">Current</Th>
                  <Th align="right">Invested</Th>
                  <Th align="right" onClick={() => toggle("value")} active={sortKey==="value"} dir={dir}>Value</Th>
                  <Th align="right" onClick={() => toggle("pl")} active={sortKey==="pl"} dir={dir}>P/L</Th>
                  <Th align="right" onClick={() => toggle("plPct")} active={sortKey==="plPct"} dir={dir}>Return</Th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <PortfolioRow key={h.id} h={h} onEdit={setEditing} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <HoldingDialog
        open={isAdding}
        onOpenChange={setIsAdding}
        onSubmit={(input) => {
          portfolioActions.addHolding(input);
          toast.success(`${input.symbol} added to portfolio`);
        }}
      />
      <HoldingDialog
        open={Boolean(editing)}
        holding={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={(input) => {
          if (!editing) return;
          portfolioActions.updateHolding(editing.id, input);
          setEditing(null);
          toast.success(`${input.symbol} updated`);
        }}
      />
    </div>
  );
}

function Th({ children, align = "left", onClick, active, dir }: { children: React.ReactNode; align?: "left" | "right"; onClick?: () => void; active?: boolean; dir?: "asc"|"desc" }) {
  return (
    <th className={`px-5 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      {onClick ? (
        <button onClick={onClick} className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}>
          {children}
          <ArrowUpDown className="h-3 w-3 opacity-60" />
        </button>
      ) : children}
    </th>
  );
}

const POPULAR_ASSETS = {
  stock: [
    { symbol: "RELIANCE.NS", name: "Reliance Industries", type: "STOCK" },
    { symbol: "TCS.NS", name: "Tata Consultancy Services (TCS)", type: "STOCK" },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank", type: "STOCK" },
    { symbol: "INFY.NS", name: "Infosys", type: "STOCK" },
    { symbol: "ICICIBANK.NS", name: "ICICI Bank", type: "STOCK" },
    { symbol: "TATAPOWER.NS", name: "Tata Power", type: "STOCK" },
    { symbol: "SBIN.NS", name: "State Bank of India", type: "STOCK" },
    { symbol: "ITC.NS", name: "ITC Limited", type: "STOCK" },
    { symbol: "BHARTIALRT.NS", name: "Bharti Airtel", type: "STOCK" },
    { symbol: "LT.NS", name: "Larsen & Toubro", type: "STOCK" },
    { symbol: "TATAMOTORS.NS", name: "Tata Motors", type: "STOCK" },
    { symbol: "AAPL", name: "Apple Inc.", type: "STOCK" },
    { symbol: "MSFT", name: "Microsoft Corporation", type: "STOCK" },
    { symbol: "NVDA", name: "NVIDIA Corporation", type: "STOCK" },
    { symbol: "GOOGL", name: "Alphabet Inc. (Google)", type: "STOCK" },
    { symbol: "AMZN", name: "Amazon.com Inc.", type: "STOCK" },
    { symbol: "META", name: "Meta Platforms Inc.", type: "STOCK" },
    { symbol: "TSLA", name: "Tesla Inc.", type: "STOCK" },
  ],
  crypto: [
    { symbol: "BTC", name: "Bitcoin", type: "CRYPTO" },
    { symbol: "ETH", name: "Ethereum", type: "CRYPTO" },
    { symbol: "SOL", name: "Solana", type: "CRYPTO" },
    { symbol: "ADA", name: "Cardano", type: "CRYPTO" },
    { symbol: "XRP", name: "Ripple", type: "CRYPTO" },
    { symbol: "DOT", name: "Polkadot", type: "CRYPTO" },
    { symbol: "DOGE", name: "Dogecoin", type: "CRYPTO" },
    { symbol: "SHIB", name: "Shiba Inu", type: "CRYPTO" },
    { symbol: "AVAX", name: "Avalanche", type: "CRYPTO" },
    { symbol: "LINK", name: "Chainlink", type: "CRYPTO" },
    { symbol: "MATIC", name: "Polygon", type: "CRYPTO" },
    { symbol: "LTC", name: "Litecoin", type: "CRYPTO" },
    { symbol: "UNI", name: "Uniswap", type: "CRYPTO" },
  ],
  commodity: [
    { symbol: "GC=F", name: "Gold Futures", type: "COMMODITY" },
    { symbol: "SI=F", name: "Silver Futures", type: "COMMODITY" },
    { symbol: "CL=F", name: "Crude Oil", type: "COMMODITY" },
    { symbol: "NG=F", name: "Natural Gas", type: "COMMODITY" },
    { symbol: "HG=F", name: "Copper Futures", type: "COMMODITY" },
  ],
  etf: [
    { symbol: "NIFTYBEES.NS", name: "Nifty 50 BeES (ETF)", type: "ETF" },
    { symbol: "GOLDBEES.NS", name: "Gold BeES (ETF)", type: "ETF" },
    { symbol: "JUNIORBEES.NS", name: "Junior BeES (ETF)", type: "ETF" },
    { symbol: "BANKBEES.NS", name: "Bank BeES (ETF)", type: "ETF" },
    { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "ETF" },
    { symbol: "SPY", name: "SPDR S&P 500 ETF", type: "ETF" },
    { symbol: "QQQ", name: "Invesco QQQ Trust", type: "ETF" },
    { symbol: "VTI", name: "Vanguard Total Stock Market", type: "ETF" },
  ],
  index: [
    { symbol: "^NSEI", name: "Nifty 50 Index", type: "INDEX" },
    { symbol: "^BSESN", name: "BSE Sensex Index", type: "INDEX" },
    { symbol: "^NSEBANK", name: "Nifty Bank Index", type: "INDEX" },
    { symbol: "^GSPC", name: "S&P 500 Index", type: "INDEX" },
    { symbol: "^IXIC", name: "Nasdaq Composite", type: "INDEX" },
    { symbol: "^DJI", name: "Dow Jones Industrial", type: "INDEX" },
    { symbol: "^FTSE", name: "FTSE 100 Index", type: "INDEX" },
  ]
};

function HoldingDialog({
  open,
  onOpenChange,
  onSubmit,
  holding,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: HoldingInput) => void;
  holding?: StoredHolding | null;
}) {
  const { preferences } = usePortfolioData();
  const currency = preferences?.currency || "INR";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<"stock" | "crypto" | "etf" | "commodity" | "index">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Array<{ symbol: string; name: string; type: string }>>([]);
  const [searching, setSearching] = useState(false);

  const rate = currencyConfig.rate;

  const [symbol, setSymbol] = useState(holding?.symbol ?? "");
  const [name, setName] = useState(holding?.name ?? "");
  const [assetType, setAssetType] = useState<AssetType>(holding?.type ?? "crypto");
  const [currentPrice, setCurrentPrice] = useState(holding?.currentPrice ?? 0);
  const [avgPrice, setAvgPrice] = useState(holding?.avgPrice ?? 0);
  const [quantity, setQuantity] = useState(holding?.quantity ?? 0);
  const [purchaseDate, setPurchaseDate] = useState(holding?.purchaseDate ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(holding?.notes ?? "");

  useEffect(() => {
    if (open) {
      setSymbol(holding?.symbol ?? "");
      setName(holding?.name ?? "");
      setAssetType(holding?.type ?? "crypto");
      setCurrentPrice(holding?.currentPrice ?? 0);
      setAvgPrice(holding?.avgPrice ?? 0);
      setQuantity(holding?.quantity ?? 0);
      setPurchaseDate(holding?.purchaseDate ?? new Date().toISOString().slice(0, 10));
      setNotes(holding?.notes ?? "");
      setSearchQuery("");
      setResults([]);
      setSelectedCategory(holding ? (holding.type.toLowerCase() as any) : "stock");
    }
  }, [open, holding]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await marketApi.search(query);
      const filtered = (res.assets || []).filter((item) => {
        const typeLower = item.type.toLowerCase();
        if (selectedCategory === "stock") return typeLower === "stock";
        if (selectedCategory === "crypto") return typeLower === "crypto";
        if (selectedCategory === "etf") return typeLower === "etf" || typeLower === "mutual_fund";
        if (selectedCategory === "commodity") return typeLower === "commodity";
        if (selectedCategory === "index") return typeLower === "index";
        return false;
      });
      setResults(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAsset = async (asset: { symbol: string; name: string; type: string }) => {
    setSymbol(asset.symbol);
    setName(asset.name);
    setAssetType(asset.type.toLowerCase() as AssetType);
    setResults([]);
    setSearchQuery("");
    
    // Fetch live quote for this symbol to pre-populate prices
    try {
      const quote = await marketApi.quote(asset.symbol);
      if (quote && quote.price) {
        setCurrentPrice(quote.price);
        setAvgPrice(quote.price);
      }
    } catch (err) {
      console.error("Failed to fetch price quote for selected asset:", err);
    }
  };

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    if (!symbol || !name) {
      setError("Please search and select an asset first.");
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than zero.");
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(avgPrice) || avgPrice < 0) {
      setError("Average purchase price cannot be negative.");
      setSubmitting(false);
      return;
    }
    if (!Number.isFinite(currentPrice) || currentPrice < 0) {
      setError("Current price cannot be negative.");
      setSubmitting(false);
      return;
    }

    onSubmit({
      symbol,
      name,
      type: assetType,
      quantity,
      avgPrice: avgPrice,
      currentPrice: currentPrice,
      purchaseDate,
      notes: notes.trim(),
    });
    onOpenChange(false);
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{holding ? "Edit holding" : "Add holding"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">{error}</div>}

          {!symbol ? (
            <div className="space-y-4 py-1">
              {/* Asset Type Selector Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-border">
                {(["stock", "crypto", "etf", "commodity", "index"] as const).map((cat) => {
                  const label = {
                    stock: "Stocks",
                    crypto: "Crypto",
                    etf: "ETFs",
                    commodity: "Commodities",
                    index: "Indices"
                  }[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSearchQuery("");
                        setResults([]);
                      }}
                      className={cn(
                        "px-3.5 py-1.5 text-xs rounded-full font-medium capitalize transition-all border shrink-0",
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  className="input pl-9"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={`Search ${selectedCategory}s (e.g. ${
                    selectedCategory === "stock" ? "reliance, tcs" :
                    selectedCategory === "crypto" ? "bitcoin, sol" :
                    selectedCategory === "commodity" ? "gold, silver" :
                    selectedCategory === "etf" ? "niftybees, spy" :
                    "nifty 50, sensex"
                  })...`}
                  autoFocus
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>

              {searching && <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin text-primary" /> Searching...</div>}
              
              {/* Conditional Popular list or search results */}
              {!searchQuery.trim() ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popular {selectedCategory}s</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {POPULAR_ASSETS[selectedCategory].map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => handleSelectAsset(item)}
                        className="flex flex-col items-start p-2.5 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                      >
                        <span className="font-semibold text-xs text-navy group-hover:text-primary transition-colors truncate w-full">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {item.symbol}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : results.length > 0 ? (
                <ul className="max-h-60 overflow-y-auto border border-border rounded-md divide-y divide-border bg-popover text-popover-foreground">
                  {results.map((r) => (
                    <li key={r.symbol}>
                      <button
                        type="button"
                        onClick={() => handleSelectAsset(r)}
                        className="w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium text-sm text-navy">{r.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({r.symbol})</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase",
                          r.type.toLowerCase() === "crypto" && "bg-purple-500/10 text-purple-600",
                          r.type.toLowerCase() === "stock" && "bg-blue-500/10 text-blue-600",
                          r.type.toLowerCase() === "etf" && "bg-green-500/10 text-green-600",
                          r.type.toLowerCase() === "commodity" && "bg-amber-500/10 text-amber-600",
                          r.type.toLowerCase() === "index" && "bg-teal-500/10 text-teal-600"
                        )}>
                          {r.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                !searching && <div className="text-center py-6 text-sm text-muted-foreground">No matching {selectedCategory}s found. Try searching globally or select another tab.</div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg border border-border">
                <div>
                  <div className="text-sm font-semibold text-navy">{name} ({symbol})</div>
                  <div className="text-xs text-muted-foreground capitalize">Asset Class: {assetType}</div>
                </div>
                {!holding && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSymbol("");
                      setName("");
                      setAssetType("crypto");
                      setCurrentPrice(0);
                      setAvgPrice(0);
                    }}
                    className="text-xs h-8 text-navy"
                  >
                    Change asset
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Purchase date">
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    type="number"
                    step="any"
                    value={quantity || ""}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="input"
                    placeholder="0.00"
                  />
                </Field>
                <Field label={`Average buy price (${currency})`}>
                  <input
                    type="number"
                    step="any"
                    value={avgPrice || ""}
                    onChange={(e) => setAvgPrice(Number(e.target.value))}
                    className="input"
                    placeholder="0.00"
                  />
                </Field>
                <Field label={`Current price (${currency})`}>
                  <input
                    type="number"
                    step="any"
                    value={currentPrice || ""}
                    onChange={(e) => setCurrentPrice(Number(e.target.value))}
                    className="input"
                    placeholder="0.00"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input min-h-24"
                  placeholder="Optional notes..."
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full" disabled={submitting}>{submitting ? "Saving..." : "Save holding"}</Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>

    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

function FilterTab({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-card text-foreground shadow-[var(--shadow-card)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{children}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10px] font-semibold num tabular-nums",
            active
              ? "bg-secondary text-muted-foreground"
              : "bg-background/60 text-muted-foreground/80",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}


function PortfolioRow({ h, onEdit }: { h: StoredHolding; onEdit: (h: StoredHolding) => void }) {
  const { price, direction } = useLiveTicker(h.symbol, h.type, h.currentPrice);

  const m = useMemo(() => {
    const value = h.quantity * price;
    const invested = h.quantity * h.avgPrice;
    const pl = value - invested;
    const plPct = invested > 0 ? (pl / invested) * 100 : 0;
    return { value, invested, pl, plPct };
  }, [h.quantity, h.avgPrice, price]);

  return (
    <tr className="border-t border-border hover:bg-secondary/40 transition-colors group">
      <td className="px-5 py-3.5">
        <Link to="/portfolio/$symbol" params={{ symbol: h.symbol }} className="flex items-center gap-3">
          <AssetIcon symbol={h.symbol} color={h.color} />
          <div className="min-w-0">
            <div className="font-medium truncate">{h.name}</div>
            <div className="text-xs text-muted-foreground">{h.symbol} · <span className="capitalize">{h.type}</span></div>
          </div>
        </Link>
      </td>
      <td className="px-5 py-3.5 text-right num">{num(h.quantity, 4)}</td>
      <td className="px-5 py-3.5 text-right num text-muted-foreground">{usd(h.avgPrice, { fromCurrency: (h as any).currency })}</td>
      <td className="px-5 py-3.5 text-right num">
        <span
          className={cn(
            "transition-colors duration-500 rounded px-1 py-0.5",
            direction === "up" && "bg-gain/20 text-gain font-medium",
            direction === "down" && "bg-loss/20 text-loss font-medium"
          )}
        >
          {usd(price, { fromCurrency: (h as any).currency })}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right num text-muted-foreground">{usd(m.invested, { fromCurrency: (h as any).currency, maximumFractionDigits: 0 })}</td>
      <td className="px-5 py-3.5 text-right num font-medium">{usd(m.value, { fromCurrency: (h as any).currency, maximumFractionDigits: 0 })}</td>
      <td className={`px-5 py-3.5 text-right num ${m.pl >= 0 ? "text-gain" : "text-loss"}`}>
        {m.pl >= 0 ? "+" : ""}{usd(m.pl, { fromCurrency: (h as any).currency, maximumFractionDigits: 0 })}
      </td>
      <td className="px-5 py-3.5 text-right">
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium num ${m.plPct >= 0 ? "bg-success/10 text-success" : "bg-loss/10 text-loss"}`}>
          {pct(m.plPct)}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" aria-label={`Edit ${h.symbol}`} onClick={() => onEdit(h)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${h.symbol}`}
            className="text-loss hover:text-loss"
            onClick={() => {
              if (confirm(`Are you sure you want to remove ${h.symbol} from your portfolio?`)) {
                portfolioActions.removeHolding(h.id);
                toast.success(`${h.symbol} removed from portfolio`);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
