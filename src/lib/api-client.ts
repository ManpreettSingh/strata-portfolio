/**
 * api-client.ts — Typed HTTP helpers for every backend endpoint.
 *
 * Authenticated calls automatically attach the JWT stored in localStorage.
 * All methods throw an Error with the server-provided message on failure.
 */

import { getAuthToken } from "./api";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

// ─── Helpers ──────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ─── Portfolio API (requires auth) ────────────────────────────────────

export type PortfolioDTO = {
  id: string;
  name: string;
  description?: string | null;
  baseCurrency: string;
  holdings: HoldingDTO[];
};

export type HoldingDTO = {
  id: string;
  quantity: string; // Decimal comes as string from Prisma
  averagePurchasePrice: string;
  purchaseDate: string;
  notes?: string | null;
  asset: AssetDTO;
};

export type AssetDTO = {
  id: string;
  symbol: string;
  name: string;
  type: string;
  exchange?: string | null;
  currency: string;
  sector?: string | null;
  region?: string | null;
};

export type TransactionDTO = {
  id: string;
  type: "BUY" | "SELL" | "DIVIDEND" | "SPLIT" | "FEE" | "EDIT";
  quantity: string;
  price: string;
  occurredAt: string;
  notes?: string | null;
  asset: AssetDTO;
};

export type DashboardDTO = {
  totalPortfolioValue: number;
  investedAmount: number;
  todaysGainLoss: number;
  allocation: { name: string; value: number }[];
  holdingsCount: number;
  holdings: Array<HoldingDTO & {
    currentPrice: number;
    invested: number;
    currentValue: number;
    unrealizedProfitLoss: number;
    portfolioName: string;
  }>;
  transactions: TransactionDTO[];
};

export const portfolioApi = {
  list: () => request<{ portfolios: PortfolioDTO[] }>("/portfolios"),
  create: (input: { name: string; description?: string; baseCurrency?: string }) =>
    request<{ portfolio: PortfolioDTO }>("/portfolios", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: { name?: string; description?: string; baseCurrency?: string }) =>
    request<{ portfolio: PortfolioDTO }>(`/portfolios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    request<void>(`/portfolios/${id}`, { method: "DELETE" }),
  dashboard: () => request<DashboardDTO>("/portfolios/dashboard/summary"),
  addHolding: (
    portfolioId: string,
    input: {
      symbol: string;
      name: string;
      assetType: string;
      quantity: number;
      averagePurchasePrice: number;
      purchaseDate: string;
      notes?: string;
    },
  ) =>
    request<{ holding: HoldingDTO }>(`/portfolios/${portfolioId}/holdings`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateHolding: (
    portfolioId: string,
    holdingId: string,
    input: Partial<{ quantity: number; averagePurchasePrice: number; purchaseDate: string; notes: string | null }>,
  ) =>
    request<{ holding: HoldingDTO }>(`/portfolios/${portfolioId}/holdings/${holdingId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  removeHolding: (portfolioId: string, holdingId: string) =>
    request<void>(`/portfolios/${portfolioId}/holdings/${holdingId}`, {
      method: "DELETE",
    }),
  generateReport: () =>
    request<{ report: string }>("/portfolios/report/generate", {
      method: "POST",
    }),
};

// ─── Watchlist API (requires auth) ────────────────────────────────────

export type WatchlistItemDTO = {
  id: string;
  asset: AssetDTO;
  quote?: { symbol: string; price: number; changePercent: number; asOf: string };
};

export const watchlistApi = {
  list: () => request<{ watchlist: WatchlistItemDTO[] }>("/watchlist"),
  add: (input: { symbol: string; name: string; assetType?: string }) =>
    request<{ watchlistItem: WatchlistItemDTO }>("/watchlist", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  remove: (assetId: string) =>
    request<void>(`/watchlist/${assetId}`, { method: "DELETE" }),
  search: (query: string) =>
    request<{ assets: AssetDTO[] }>(`/watchlist/search/assets?q=${encodeURIComponent(query)}`),
};

// ─── Market API (public — no auth needed) ─────────────────────────────

export type PriceQuote = {
  symbol: string;
  price: number;
  changePercent: number;
  asOf: string;
};

export type HistoryPoint = {
  timestamp: number;
  price: number;
};

export const marketApi = {
  quote: (symbol: string) =>
    request<PriceQuote>(`/markets/quote/${encodeURIComponent(symbol)}`),
  quotes: (symbols: string[]) =>
    request<{ quotes: PriceQuote[] }>(`/markets/quotes?symbols=${encodeURIComponent(symbols.join(","))}`),
  search: (query: string) =>
    request<{ assets: Array<{ symbol: string; name: string; type: string }> }>(
      `/markets/search?q=${encodeURIComponent(query)}`,
    ),
  history: (symbol: string, days: number) =>
    request<{ symbol: string; days: number; history: HistoryPoint[] }>(
      `/markets/history/${encodeURIComponent(symbol)}?days=${days}`,
    ),
  news: (query: string) =>
    request<{ news: Array<{ title: string; link: string; source: string; pubDate: string }> }>(
      `/markets/news?q=${encodeURIComponent(query)}`,
    ),
};
