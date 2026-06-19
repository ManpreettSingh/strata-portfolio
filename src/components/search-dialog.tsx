import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, TrendingUp, Clock } from "lucide-react";
import { usePortfolioData } from "@/lib/portfolio-store";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { holdings, watchlist } = usePortfolioData();
  const allAssets = useMemo(
    () => [
      ...holdings.map((h) => ({ symbol: h.symbol, name: h.name, type: h.type, inPortfolio: true })),
      ...watchlist.map((w) => ({ symbol: w.symbol, name: w.name, type: w.type, inPortfolio: false })),
    ],
    [holdings, watchlist],
  );
  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return allAssets.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const recent = ["BTC", "ETH", "SOL"];
  const popular = ["BTC", "ETH", "SOL", "DOGE", "ADA"];

  const go = (symbol: string) => {
    const h = holdings.find((x) => x.symbol === symbol);
    if (h) navigate({ to: "/portfolio/$symbol", params: { symbol: h.symbol } });
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search crypto assets…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">esc</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {query ? (
            results.length ? (
              <ul className="space-y-1">
                {results.map((r) => (
                  <li key={`${r.symbol}-${r.inPortfolio ? "portfolio" : "watchlist"}`}>
                    <button onClick={() => go(r.symbol)} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary transition-colors">
                      <div className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-xs font-semibold text-foreground">{r.symbol.slice(0, 2)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.symbol} · {r.type}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">No results for "{query}"</div>
            )
          ) : (
            <>
              <Section title="Recent" icon={<Clock className="h-3.5 w-3.5" />}>
                {recent.map((s) => <Row key={s} symbol={s} assets={allAssets} onClick={() => go(s)} />)}
              </Section>
              <Section title="Popular" icon={<TrendingUp className="h-3.5 w-3.5" />}>
                {popular.map((s) => <Row key={s} symbol={s} assets={allAssets} onClick={() => go(s)} />)}
              </Section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">{icon}{title}</div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function Row({ symbol, assets, onClick }: { symbol: string; assets: Array<{ symbol: string; name: string }>; onClick: () => void }) {
  const a = assets.find((x) => x.symbol === symbol);
  if (!a) return null;
  return (
    <li>
      <button onClick={onClick} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-secondary transition-colors">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-secondary text-[11px] font-semibold">{a.symbol.slice(0, 2)}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{a.name}</div>
        </div>
        <div className="text-xs text-muted-foreground">{a.symbol}</div>
      </button>
    </li>
  );
}
