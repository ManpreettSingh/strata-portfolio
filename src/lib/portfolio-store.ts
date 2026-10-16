import { useSyncExternalStore } from "react";
import { holdings as seedHoldings, watchlist as seedWatchlist, type AssetType, type Holding } from "@/lib/mock-data";
import { portfolioApi, watchlistApi } from "./api-client";
import { toast } from "sonner";

export type WatchlistItem = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  icon: string;
  color: string;
  type: AssetType;
  currency?: string;
};

export type HoldingInput = {
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  purchaseDate: string;
  notes?: string;
  /** Currency the live quote is priced in (e.g. INR for NSE stocks). Falls back to a symbol guess when absent. */
  currency?: string;
};

export type Preferences = {
  currency: string;
  tz: string;
};

export type ActivityItem = {
  id: string;
  type: "Buy" | "Sell" | "Watchlist" | "Update";
  symbol: string;
  amount: number;
  price: number;
  timestamp: number;
  notes?: string | null;
};

type PortfolioState = {
  holdings: Array<Holding & { purchaseDate?: string; notes?: string }>;
  watchlist: WatchlistItem[];
  preferences: Preferences;
  activity: ActivityItem[];
  isSyncing?: boolean;
};

export type StoredHolding = PortfolioState["holdings"][number];

const STORAGE_KEY = "folio.guest.portfolio";
const listeners = new Set<() => void>();

export const currencyConfig = {
  current: "INR",
  rate: 83.5
};

export let exchangeRates: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.93,
  GBP: 0.79,
  JPY: 158.0
};

/**
 * Determine the native currency for an asset based on its symbol and DB currency.
 * Indian stocks (.NS/.BO) are always INR; everything else defaults to USD.
 */
export function assetCurrency(symbol: string, dbCurrency?: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith(".NS") || upper.endsWith(".BO")) return "INR";
  if (upper.startsWith("^NSE") || upper.startsWith("^BSESN")) return "INR";
  return dbCurrency || "USD";
}

/**
 * Convert a value from its native currency to USD using exchange rates.
 * Used for aggregating portfolio values across assets with different currencies.
 */
export function normalizeToUSD(value: number, currency: string): number {
  const upper = currency.toUpperCase();
  if (upper === "USD") return value;
  const rate = exchangeRates[upper] ?? 1.0;
  return value / rate;
}

/**
 * Convert a value from one currency to another using exchange rates.
 */
export function convertCurrency(value: number, from: string, to: string): number {
  const usdValue = normalizeToUSD(value, from);
  const targetRate = exchangeRates[to.toUpperCase()] ?? 1.0;
  return usdValue * targetRate;
}

// Private backend sync flags
let activePortfolioId: string | null = null;
let isSyncedWithBackend = false;

// Fetch exchange rates from free, highly available currency API
if (typeof window !== "undefined") {
  fetch("https://open.er-api.com/v6/latest/USD")
    .then((res) => res.json())
    .then((data) => {
      if (data && data.rates) {
        exchangeRates = { ...exchangeRates, ...data.rates };
        // Sync config with loaded state preferences
        const cur = state.preferences?.currency || "INR";
        currencyConfig.current = cur;
        currencyConfig.rate = exchangeRates[cur] ?? 83.5;
        listeners.forEach((listener) => listener());
      }
    })
    .catch((err) => console.error("Failed to fetch exchange rates, using defaults:", err));
}

const initialState: PortfolioState = {
  holdings: seedHoldings.map((holding) => ({
    ...holding,
    purchaseDate: "2025-01-15",
    notes: "Long-term hold. Reviewing thesis quarterly.",
  })),
  watchlist: seedWatchlist.map((item, index) => ({
    ...item,
    id: `watch-${index + 1}`,
    type: "stock",
  })),
  preferences: {
    currency: "INR",
    tz: "Asia/Kolkata",
  },
  activity: [
    { id: "a1", type: "Buy", symbol: "SOL", amount: 10, price: 162.2, timestamp: Date.now() - 2 * 60 * 60 * 1000 },
    { id: "a2", type: "Buy", symbol: "BTC", amount: 0.02, price: 66840, timestamp: Date.now() - 24 * 60 * 60 * 1000 },
    { id: "a3", type: "Sell", symbol: "DOGE", amount: 2000, price: 0.158, timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000 },
    { id: "a4", type: "Buy", symbol: "ETH", amount: 0.5, price: 3480, timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 },
    { id: "a5", type: "Buy", symbol: "LINK", amount: 15, price: 15.6, timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 },
  ],
  isSyncing: false,
};

function getActiveStorageKey(): string {
  if (typeof window === "undefined") return STORAGE_KEY;
  const token = localStorage.getItem("folio.auth.token");
  const userJson = localStorage.getItem("folio.auth.user");
  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.id) {
        return `folio.user.${user.id}.portfolio`;
      }
    } catch {}
  }
  return STORAGE_KEY;
}

function readState(): PortfolioState {
  if (typeof window === "undefined") return initialState;
  const token = localStorage.getItem("folio.auth.token");
  const key = getActiveStorageKey();
  const raw = localStorage.getItem(key);
  if (!raw) {
    // Set initial config
    currencyConfig.current = initialState.preferences.currency;
    currencyConfig.rate = exchangeRates[initialState.preferences.currency] ?? 83.5;
    if (key !== STORAGE_KEY || token) {
      return {
        holdings: [],
        watchlist: [],
        preferences: initialState.preferences,
        activity: [],
        isSyncing: false,
      };
    }
    return initialState;
  }
  try {
    const parsed = JSON.parse(raw) as any;
    if (!parsed.preferences) {
      parsed.preferences = initialState.preferences;
    }
    if (!parsed.activity) {
      parsed.activity = key !== STORAGE_KEY ? [] : initialState.activity;
    }
    // Update config
    currencyConfig.current = parsed.preferences.currency || "INR";
    currencyConfig.rate = exchangeRates[parsed.preferences.currency] ?? 83.5;
    parsed.isSyncing = false;
    return parsed as PortfolioState;
  } catch {
    // Set initial config
    currencyConfig.current = initialState.preferences.currency;
    currencyConfig.rate = exchangeRates[initialState.preferences.currency] ?? 83.5;
    return key !== STORAGE_KEY ? { holdings: [], watchlist: [], preferences: initialState.preferences, activity: [] } : initialState;
  }
}

let state = readState();

function writeState(next: PortfolioState) {
  state = next;
  if (state.preferences) {
    currencyConfig.current = state.preferences.currency || "INR";
    currencyConfig.rate = exchangeRates[state.preferences.currency] ?? 83.5;
  }
  if (typeof window !== "undefined") {
    const key = getActiveStorageKey();
    localStorage.setItem(key, JSON.stringify(next));
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return state;
}

/**
 * What the signed-out (guest) portfolio saved in this browser contains, read straight from storage.
 * Used after sign-in, when the live store has already switched to the account's own data.
 */
export function guestDataSummary(): { holdings: number; watchlist: number } {
  if (typeof window === "undefined") return { holdings: 0, watchlist: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { holdings: 0, watchlist: 0 };
    const parsed = JSON.parse(raw);
    return {
      holdings: Array.isArray(parsed?.holdings) ? parsed.holdings.length : 0,
      watchlist: Array.isArray(parsed?.watchlist) ? parsed.watchlist.length : 0,
    };
  } catch {
    return { holdings: 0, watchlist: 0 };
  }
}

export function usePortfolioData() {
  return useSyncExternalStore(subscribe, snapshot, () => initialState);
}

export function computeMetrics(h: Pick<Holding, "quantity" | "avgPrice" | "currentPrice">) {
  const invested = h.quantity * h.avgPrice;
  const value = h.quantity * h.currentPrice;
  const pl = value - invested;
  const plPct = invested > 0 ? (pl / invested) * 100 : 0;
  return { invested, value, pl, plPct };
}

export function portfolioSummary(holdings: PortfolioState["holdings"]) {
  let invested = 0;
  let value = 0;
  let dayChange = 0;
  for (const h of holdings) {
    const cur = assetCurrency(h.symbol, (h as any).currency);
    const currentPriceUSD = normalizeToUSD(h.currentPrice, cur);
    const avgPriceUSD = normalizeToUSD(h.avgPrice, cur);
    
    const hInvested = h.quantity * avgPriceUSD;
    const hValue = h.quantity * currentPriceUSD;
    
    invested += hInvested;
    value += hValue;
    dayChange += hValue * (h.dayChangePct / 100);
  }
  const totalPL = value - invested;
  const totalPLPct = invested > 0 ? (totalPL / invested) * 100 : 0;
  const dayChangePct = value - dayChange > 0 ? (dayChange / (value - dayChange)) * 100 : 0;
  return { invested, value, totalPL, totalPLPct, dayChange, dayChangePct, count: holdings.length };
}

export const portfolioActions = {
  async syncWithBackend() {
    const token = typeof window !== "undefined" ? localStorage.getItem("folio.auth.token") : null;
    if (!token) {
      if (isSyncedWithBackend) {
        isSyncedWithBackend = false;
        activePortfolioId = null;
        writeState(readState()); // Revert back to local storage guest state
      }
      return;
    }

    try {
      // 1. Get portfolios
      const listRes = await portfolioApi.list();
      let portId = "";
      if (listRes.portfolios.length === 0) {
        const createRes = await portfolioApi.create({
          name: "My Portfolio",
          baseCurrency: "USD",
        });
        portId = createRes.portfolio.id;
      } else {
        portId = listRes.portfolios[0].id;
      }
      activePortfolioId = portId;

      // If we have a token but we're not yet synced, flag as syncing
      // so the UI can show a loading skeleton instead of flashing empty/guest data
      if (!isSyncedWithBackend) {
        writeState({
          ...state,
          isSyncing: true,
        });
      }

      // 2. Fetch dashboard and watchlist
      const [dashRes, watchRes] = await Promise.all([
        portfolioApi.dashboard(),
        watchlistApi.list(),
      ]);
      isSyncedWithBackend = true;

      // 3. Map holdings
      const mappedHoldings = dashRes.holdings.map((h) => ({
        id: h.id,
        symbol: h.asset.symbol,
        name: h.asset.name,
        type: h.asset.type.toLowerCase() as any,
        icon: h.asset.symbol.slice(0, 1),
        color: colorForSymbol(h.asset.symbol),
        quantity: Number(h.quantity),
        avgPrice: Number(h.averagePurchasePrice),
        currentPrice: h.currentPrice,
        dayChangePct: 0,
        sector: h.asset.sector || "Crypto",
        region: h.asset.region || "Global",
        purchaseDate: new Date(h.purchaseDate).toISOString().slice(0, 10),
        notes: h.notes || "",
        currency: assetCurrency(h.asset.symbol, h.asset.currency),
      }));

      // 4. Map watchlist
      const mappedWatchlist = watchRes.watchlist.map((w) => ({
        id: w.id,
        symbol: w.asset.symbol,
        name: w.asset.name,
        price: w.quote?.price ?? 0,
        change: w.quote?.changePercent ?? 0,
        icon: w.asset.symbol.slice(0, 1),
        color: colorForSymbol(w.asset.symbol),
        type: w.asset.type.toLowerCase() as any,
        assetId: w.asset.id,
        currency: assetCurrency(w.asset.symbol, w.asset.currency),
      }));

      // 4.5 Map transactions
      const mappedActivity: ActivityItem[] = (dashRes.transactions || []).map((t) => ({
        id: t.id,
        type: t.type === "BUY" ? "Buy" : t.type === "SELL" ? "Sell" : "Update",
        symbol: t.asset.symbol,
        amount: Number(t.quantity),
        price: Number(t.price),
        timestamp: new Date(t.occurredAt).getTime(),
        notes: t.notes,
      }));

      // 5. Write synced backend state
      writeState({
        ...state,
        holdings: mappedHoldings,
        watchlist: mappedWatchlist,
        preferences: state.preferences || initialState.preferences,
        activity: mappedActivity.length > 0 ? mappedActivity : (state.activity || []),
        isSyncing: false,
      });
    } catch (err) {
      console.error("Failed to sync store state with backend:", err);
      writeState({ ...state, isSyncing: false });
    }
  },

  async mergeGuestData() {
    const token = typeof window !== "undefined" ? localStorage.getItem("folio.auth.token") : null;
    if (!token) return;

    let portId = activePortfolioId;
    if (!portId) {
      try {
        const listRes = await portfolioApi.list();
        if (listRes.portfolios.length === 0) {
          const createRes = await portfolioApi.create({
            name: "My Portfolio",
            baseCurrency: "USD",
          });
          portId = createRes.portfolio.id;
        } else {
          portId = listRes.portfolios[0].id;
        }
        activePortfolioId = portId;
        isSyncedWithBackend = true;
      } catch (err) {
        console.error("Failed to resolve portfolio for merging:", err);
        throw err;
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PortfolioState;
      const guestHoldings = parsed.holdings || [];
      const guestWatchlist = parsed.watchlist || [];

      // Persist what is still un-merged after every item, so a failure part-way through can be
      // retried without uploading (and double counting) the holdings that already went through.
      const remaining = { ...parsed, holdings: [...guestHoldings], watchlist: [...guestWatchlist] };
      const saveRemaining = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));

      // 1. Upload guest holdings to backend
      for (const h of guestHoldings) {
        await portfolioApi.addHolding(portId, {
          symbol: h.symbol,
          name: h.name,
          assetType: h.type.toUpperCase(),
          quantity: h.quantity,
          averagePurchasePrice: h.avgPrice,
          purchaseDate: h.purchaseDate ? new Date(h.purchaseDate).toISOString() : new Date().toISOString(),
          notes: h.notes,
        });
        remaining.holdings = remaining.holdings.filter((x) => x !== h);
        saveRemaining();
      }

      // 2. Upload guest watchlist to backend
      for (const w of guestWatchlist) {
        await watchlistApi.add({
          symbol: w.symbol,
          name: w.name,
          assetType: w.type.toUpperCase(),
        });
        remaining.watchlist = remaining.watchlist.filter((x) => x !== w);
        saveRemaining();
      }

      // 3. Clear guest data in localStorage so we don't merge it again
      localStorage.removeItem(STORAGE_KEY);

      // 4. Sync with backend
      await portfolioActions.syncWithBackend();
    } catch (err) {
      console.error("Failed to merge guest data with backend:", err);
      throw err;
    }
  },

  async addHolding(input: HoldingInput) {
    // Check if we already have this asset in our holdings (optimistic/guest merge)
    const existingIdx = state.holdings.findIndex(h => h.symbol.toUpperCase() === input.symbol.toUpperCase());
    
    let nextHoldings = [...state.holdings];
    if (existingIdx !== -1) {
      const existing = state.holdings[existingIdx];
      const existingQty = existing.quantity;
      const existingPrice = existing.avgPrice;
      const newQty = input.quantity;
      const newPrice = input.avgPrice;

      const combinedQty = existingQty + newQty;
      const combinedPrice = combinedQty > 0 ? (existingQty * existingPrice + newQty * newPrice) / combinedQty : 0;

      nextHoldings[existingIdx] = {
        ...existing,
        quantity: combinedQty,
        avgPrice: combinedPrice,
        currentPrice: input.currentPrice,
        notes: [existing.notes, input.notes].filter(Boolean).join(" | ").slice(0, 1000)
      };
    } else {
      const nextHolding = {
        ...input,
        id: crypto.randomUUID(),
        icon: input.symbol.slice(0, 1),
        color: colorForSymbol(input.symbol),
        dayChangePct: 0,
        sector: input.type === "crypto" ? "Crypto" : input.type === "etf" ? "Index" : "Other",
        region: input.type === "crypto" ? "Global" : "US",
        currency: input.currency || assetCurrency(input.symbol),
      };
      nextHoldings = [nextHolding, ...state.holdings];
    }

    const newActivity: ActivityItem = {
      id: crypto.randomUUID(),
      type: "Buy",
      symbol: input.symbol,
      amount: input.quantity,
      price: input.avgPrice,
      timestamp: Date.now(),
    };
    writeState({
      ...state,
      holdings: nextHoldings,
      activity: [newActivity, ...(state.activity || [])],
    });

    // Sync to backend in background (non-blocking)
    if (isSyncedWithBackend && activePortfolioId) {
      if (existingIdx !== -1) {
        const existing = state.holdings[existingIdx];
        const combinedQty = nextHoldings[existingIdx].quantity;
        const combinedPrice = nextHoldings[existingIdx].avgPrice;
        
        portfolioApi.updateHolding(activePortfolioId, existing.id, {
          quantity: combinedQty,
          averagePurchasePrice: combinedPrice,
          purchaseDate: new Date(input.purchaseDate).toISOString(),
          notes: nextHoldings[existingIdx].notes,
        }).then(() => {
          portfolioActions.syncWithBackend();
        }).catch((err) => {
          console.error("Failed to update merged holding on backend:", err);
          toast.error("Failed to merge holding in database");
        });
      } else {
        portfolioApi.addHolding(activePortfolioId, {
          symbol: input.symbol,
          name: input.name,
          assetType: input.type.toUpperCase() as any,
          quantity: input.quantity,
          averagePurchasePrice: input.avgPrice,
          purchaseDate: new Date(input.purchaseDate).toISOString(),
          notes: input.notes,
        }).then(() => {
          // Background sync to get the real backend IDs
          portfolioActions.syncWithBackend();
        }).catch((err) => {
          console.error("Failed to add holding to backend:", err);
          toast.error("Failed to save holding to database");
        });
      }
    }
  },

  async updateHolding(id: string, input: HoldingInput) {
    // Always optimistically update the UI immediately
    const newActivity: ActivityItem = {
      id: crypto.randomUUID(),
      type: "Update",
      symbol: input.symbol,
      amount: input.quantity,
      price: input.avgPrice,
      timestamp: Date.now(),
    };
    writeState({
      ...state,
      holdings: state.holdings.map((holding) =>
        holding.id === id
          ? { ...holding, ...input, icon: input.symbol.slice(0, 1), color: holding.color || colorForSymbol(input.symbol) }
          : holding,
      ),
      activity: [newActivity, ...(state.activity || [])],
    });

    // Sync to backend in background (non-blocking)
    if (isSyncedWithBackend && activePortfolioId) {
      portfolioApi.updateHolding(activePortfolioId, id, {
        quantity: input.quantity,
        averagePurchasePrice: input.avgPrice,
        purchaseDate: new Date(input.purchaseDate).toISOString(),
        notes: input.notes,
      }).then(() => {
        portfolioActions.syncWithBackend();
      }).catch((err) => {
        console.error("Failed to update holding on backend:", err);
        toast.error("Failed to update holding in database");
      });
    }
  },

  async removeHolding(id: string) {
    // Always optimistically update the UI immediately
    const holding = state.holdings.find((h) => h.id === id);
    const nextHoldings = state.holdings.filter((h) => h.id !== id);
    const activityUpdate = holding ? [{
      id: crypto.randomUUID(),
      type: "Sell" as const,
      symbol: holding.symbol,
      amount: holding.quantity,
      price: holding.currentPrice,
      timestamp: Date.now(),
    }] : [];
    writeState({
      ...state,
      holdings: nextHoldings,
      activity: [...activityUpdate, ...(state.activity || [])],
    });

    // Sync to backend in background (non-blocking)
    if (isSyncedWithBackend && activePortfolioId) {
      portfolioApi.removeHolding(activePortfolioId, id).then(() => {
        portfolioActions.syncWithBackend();
      }).catch((err) => {
        console.error("Failed to delete holding from backend:", err);
        toast.error("Failed to delete holding from database");
      });
    }
  },

  async addToWatchlist(input: Omit<WatchlistItem, "id" | "icon" | "color">) {
    if (state.watchlist.some((item) => item.symbol === input.symbol)) return;

    // Optimistically update UI immediately
    const newActivity: ActivityItem = {
      id: crypto.randomUUID(),
      type: "Watchlist",
      symbol: input.symbol,
      amount: 1,
      price: input.price,
      timestamp: Date.now(),
    };
    writeState({
      ...state,
      watchlist: [
        { ...input, id: crypto.randomUUID(), icon: input.symbol.slice(0, 1), color: colorForSymbol(input.symbol) },
        ...state.watchlist,
      ],
      activity: [newActivity, ...(state.activity || [])],
    });

    // Sync to backend in background
    if (isSyncedWithBackend) {
      watchlistApi.add({
        symbol: input.symbol,
        name: input.name,
        assetType: input.type.toUpperCase(),
      }).then(() => {
        portfolioActions.syncWithBackend();
      }).catch((err) => {
        console.error("Failed to add to watchlist on backend:", err);
        toast.error("Failed to add watchlist item to database");
      });
    }
  },

  async removeFromWatchlist(id: string) {
    // Optimistically update UI immediately
    const item = state.watchlist.find((w) => w.id === id);
    writeState({ ...state, watchlist: state.watchlist.filter((w) => w.id !== id) });

    // Sync to backend in background
    if (isSyncedWithBackend) {
      const assetId = item ? (item as any).assetId : null;
      if (assetId) {
        watchlistApi.remove(assetId).then(() => {
          portfolioActions.syncWithBackend();
        }).catch((err) => {
          console.error("Failed to remove from watchlist on backend:", err);
          toast.error("Failed to remove watchlist item from database");
        });
      }
    }
  },

  resetGuestData() {
    writeState(initialState);
  },

  /** Delete the saved guest (signed-out) portfolio without touching the signed-in account's data. */
  discardGuestData() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },

  clearGuestData() {
    writeState({
      holdings: [],
      watchlist: [],
      preferences: state.preferences || initialState.preferences,
      activity: [],
    });
  },

  setCurrency(currency: string) {
    const nextPrefs = { ...(state.preferences || initialState.preferences), currency };
    writeState({ ...state, preferences: nextPrefs });
  },

  setTz(tz: string) {
    const nextPrefs = { ...(state.preferences || initialState.preferences), tz };
    writeState({ ...state, preferences: nextPrefs });
  },
};

function colorForSymbol(symbol: string) {
  const colors = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#0891b2", "#f59e0b"];
  const sum = [...symbol].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}
