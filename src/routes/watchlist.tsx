import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { AssetIcon } from "@/components/asset-icon";
import { sparkline } from "@/lib/mock-data";
import { portfolioActions, usePortfolioData, type WatchlistItem, assetCurrency } from "@/lib/portfolio-store";
import { usd, pct } from "@/lib/format";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { marketApi } from "@/lib/api-client";
import { useLiveTicker } from "@/hooks/use-live-ticker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — Folio" }] }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { watchlist } = usePortfolioData();
  const [adding, setAdding] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, { price: number; change: number }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (watchlist.length === 0) {
      setQuotes({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchQuotes() {
      try {
        const symbols = watchlist.map((w) => w.symbol);
        const res = await marketApi.quotes(symbols);
        if (cancelled) return;

        const quoteMap: Record<string, { price: number; change: number }> = {};
        for (const q of res.quotes) {
          quoteMap[q.symbol.toUpperCase()] = {
            price: q.price,
            change: q.changePercent,
          };
        }
        setQuotes(quoteMap);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch watchlist quotes:", err);
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [watchlist]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 space-y-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-4xl text-navy">Watchlist</h1>
            <p className="text-sm text-muted-foreground mt-1">Assets you're keeping an eye on.</p>
          </div>
          <Button className="rounded-full shrink-0" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add asset
          </Button>
        </div>

        {loading && Object.keys(quotes).length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : watchlist.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            No assets in your watchlist yet. Click "Add asset" to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {watchlist.map((w, idx) => (
              <WatchlistCard
                key={w.symbol}
                item={w}
                index={idx}
                fallbackPrice={quotes[w.symbol.toUpperCase()]?.price ?? w.price}
                fallbackChange={quotes[w.symbol.toUpperCase()]?.change ?? w.change}
              />
            ))}
          </div>
        )}
      </main>
      <WatchlistDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

interface WatchlistCardProps {
  item: WatchlistItem;
  index: number;
  fallbackPrice: number;
  fallbackChange: number;
}

function WatchlistCard({ item, index, fallbackPrice, fallbackChange }: WatchlistCardProps) {
  const { price, changePercent, direction } = useLiveTicker(
    item.symbol,
    item.type,
    fallbackPrice,
    fallbackChange
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-[var(--shadow-hover)] relative flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3">
          <Link
            to="/portfolio/$symbol"
            params={{ symbol: item.symbol }}
            className="flex items-center gap-3 min-w-0 hover:opacity-85 transition-opacity flex-1 cursor-pointer"
          >
            <AssetIcon symbol={item.symbol} color={item.color} />
            <div className="min-w-0">
              <div className="font-medium truncate text-navy group-hover:text-primary transition-colors">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.symbol}</div>
            </div>
          </Link>
          <button
            className="text-muted-foreground hover:text-loss transition-colors p-1.5 rounded-full hover:bg-secondary shrink-0"
            aria-label={`Remove ${item.symbol} from watchlist`}
            onClick={() => {
              portfolioActions.removeFromWatchlist(item.id);
              toast.success(`${item.symbol} removed from watchlist`);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <Link
          to="/portfolio/$symbol"
          params={{ symbol: item.symbol }}
          className="mt-4 flex items-end justify-between hover:opacity-85 transition-opacity cursor-pointer block"
        >
          <div>
            <div
              className={cn(
                "text-2xl font-semibold num transition-all duration-300 rounded px-1 -mx-1 text-navy",
                direction === "up" && "bg-gain/20 text-gain scale-105",
                direction === "down" && "bg-loss/20 text-loss scale-105"
              )}
            >
              {usd(price, { fromCurrency: assetCurrency(item.symbol, item.currency) })}
            </div>
            <div className={cn("text-xs font-medium num mt-1", changePercent >= 0 ? "text-gain" : "text-loss")}>
              {changePercent >= 0 ? "+" : ""}{pct(changePercent)} today
            </div>
          </div>
          <div className="h-12 w-28">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={sparkline(index + 1)}>
                <Line
                  dataKey="v"
                  stroke={changePercent >= 0 ? "var(--color-success)" : "var(--color-loss)"}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Link>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full rounded-full"
        onClick={() => {
          portfolioActions.addHolding({
            symbol: item.symbol,
            name: item.name,
            type: item.type,
            quantity: 1,
            avgPrice: price,
            currentPrice: price,
            purchaseDate: new Date().toISOString().slice(0, 10),
          });
          toast.success(`${item.symbol} added to portfolio`);
        }}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add to portfolio
      </Button>
    </div>
  );
}

function WatchlistDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; type: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"stock" | "crypto" | "etf" | "commodity" | "index">("stock");

  const SUGGESTED_ASSETS = {
    stock: [
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "MSFT", name: "Microsoft" },
      { symbol: "NVDA", name: "NVIDIA" },
      { symbol: "RELIANCE.NS", name: "Reliance" },
      { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
      { symbol: "TCS.NS", name: "TCS" },
    ],
    crypto: [
      { symbol: "BTC", name: "Bitcoin" },
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "SOL", name: "Solana" },
      { symbol: "DOGE", name: "Dogecoin" },
      { symbol: "XRP", name: "Ripple" },
      { symbol: "ADA", name: "Cardano" },
    ],
    etf: [
      { symbol: "VOO", name: "Vanguard S&P 500" },
      { symbol: "QQQ", name: "Invesco QQQ" },
      { symbol: "NIFTYBEES.NS", name: "Nifty BeES" },
    ],
    commodity: [
      { symbol: "GC=F", name: "Gold Futures" },
      { symbol: "SI=F", name: "Silver Futures" },
      { symbol: "CL=F", name: "Crude Oil" },
    ],
    index: [
      { symbol: "^NSEI", name: "Nifty 50 Index" },
      { symbol: "^BSESN", name: "BSE Sensex Index" },
      { symbol: "^GSPC", name: "S&P 500 Index" },
    ]
  };

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
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
        setSearchResults(filtered);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedCategory]);

  const handleAddAsset = async (symbol: string, name: string, type: string) => {
    setAddingSymbol(symbol);
    try {
      const quote = await marketApi.quote(symbol);
      await portfolioActions.addToWatchlist({
        symbol: symbol.toUpperCase(),
        name,
        price: quote.price,
        change: quote.changePercent,
        type: type.toLowerCase() as any,
      });
      toast.success(`${symbol} added to watchlist`);
      setQuery("");
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || `Failed to add ${symbol} to watchlist`);
    } finally {
      setAddingSymbol(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) setQuery("");
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Asset to Watchlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Asset Category Selection Tabs */}
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
                    setQuery("");
                    setSearchResults([]);
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full font-medium capitalize transition-all border shrink-0",
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${selectedCategory}s (e.g. ${
                selectedCategory === "stock" ? "AAPL, RELIANCE" :
                selectedCategory === "crypto" ? "BTC, ETH" :
                selectedCategory === "etf" ? "VOO, NIFTYBEES" :
                selectedCategory === "commodity" ? "GC=F" :
                "^NSEI"
              })...`}
              className="w-full pl-9 pr-4 py-2 bg-surface-muted border border-border rounded-lg text-sm outline-none focus:border-primary transition-colors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {query.trim() ? (
            /* Search Results */
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Results</div>
              {searching ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No assets found.</div>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-border border border-border rounded-lg">
                  {searchResults.map((item) => (
                    <button
                      key={item.symbol}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/45 text-left transition-colors disabled:opacity-50"
                      onClick={() => handleAddAsset(item.symbol, item.name, item.type)}
                      disabled={addingSymbol !== null}
                    >
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.symbol} • {item.type}</div>
                      </div>
                      {addingSymbol === item.symbol ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <span className="text-xs text-primary font-medium">Add</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Popular Suggested Assets for Selected Category */
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popular {selectedCategory}s</div>
              <div className="grid grid-cols-3 gap-2">
                {SUGGESTED_ASSETS[selectedCategory].map((item) => (
                  <button
                    key={item.symbol}
                    className="flex flex-col items-center justify-center p-3 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-center group disabled:opacity-50"
                    onClick={() => handleAddAsset(item.symbol, item.name, selectedCategory)}
                    disabled={addingSymbol !== null}
                  >
                    {addingSymbol === item.symbol ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <>
                        <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {item.symbol}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">
                          {item.name}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
