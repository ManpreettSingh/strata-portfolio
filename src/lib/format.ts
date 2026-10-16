import { currencyConfig, exchangeRates } from "./portfolio-store";

const localeForCurrency = (currency: string) => {
  if (currency === "INR") return "en-IN";
  if (currency === "EUR") return "de-DE";
  if (currency === "JPY") return "ja-JP";
  return "en-US";
};



export const usd = (n: number, opts: Intl.NumberFormatOptions & { fromCurrency?: string } = {}) => {
  const { fromCurrency = "USD", ...formatOpts } = opts;
  const cur = currencyConfig.current;
  
  let converted = n;
  if (fromCurrency.toUpperCase() !== cur.toUpperCase()) {
    const sourceRate = exchangeRates[fromCurrency.toUpperCase()] ?? 1.0;
    const usdValue = n / sourceRate;
    const targetRate = exchangeRates[cur] ?? 83.5;
    converted = usdValue * targetRate;
  }
  
  return new Intl.NumberFormat(localeForCurrency(cur), {
    style: "currency",
    currency: cur,
    maximumFractionDigits: converted !== 0 && Math.abs(converted) < 1 ? 4 : 2,
    ...formatOpts
  }).format(converted);
};

export const compactUsd = (n: number, opts: { fromCurrency?: string } = {}) => {
  const { fromCurrency = "USD" } = opts;
  const cur = currencyConfig.current;
  
  let converted = n;
  if (fromCurrency.toUpperCase() !== cur.toUpperCase()) {
    const sourceRate = exchangeRates[fromCurrency.toUpperCase()] ?? 1.0;
    const usdValue = n / sourceRate;
    const targetRate = exchangeRates[cur] ?? 83.5;
    converted = usdValue * targetRate;
  }
  
  return new Intl.NumberFormat(localeForCurrency(cur), {
    style: "currency",
    currency: cur,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(converted);
};

export const pct = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;

export const num = (n: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);

/* ── Indian Number Formatting (K / L / Cr) ── */
function compactIndian(n: number): string {
  if (n === 0) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}₹${(abs / 1e7 / 100).toFixed(1)}Cr`;
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(abs < 1 ? 4 : 2)}`;
}

/* ── Western Number Formatting (K / M / B) ── */
function compactWestern(n: number, symbol: string): string {
  if (n === 0) return `${symbol}0`;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${symbol}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${symbol}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${symbol}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${symbol}${abs.toFixed(abs < 1 ? 4 : 2)}`;
}

/**
 * Smart compact formatting that picks Indian vs Western style
 * based on the current display currency. Returns a short string
 * that prevents overflow in KPI cards.
 */
export function smartCompact(n: number, opts: { fromCurrency?: string } = {}): string {
  const { fromCurrency = "USD" } = opts;
  const cur = currencyConfig.current;

  // Convert to display currency first
  let converted = n;
  if (fromCurrency.toUpperCase() !== cur.toUpperCase()) {
    const sourceRate = exchangeRates[fromCurrency.toUpperCase()] ?? 1.0;
    const usdValue = n / sourceRate;
    const targetRate = exchangeRates[cur] ?? 83.5;
    converted = usdValue * targetRate;
  }

  if (cur === "INR") return compactIndian(converted);

  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return compactWestern(converted, symbols[cur] ?? cur + " ");
}

/**
 * Format a number as full currency string (no compact) for tooltip display.
 */
export function fullCurrency(n: number, opts: { fromCurrency?: string } = {}): string {
  const { fromCurrency = "USD" } = opts;
  const cur = currencyConfig.current;

  let converted = n;
  if (fromCurrency.toUpperCase() !== cur.toUpperCase()) {
    const sourceRate = exchangeRates[fromCurrency.toUpperCase()] ?? 1.0;
    const usdValue = n / sourceRate;
    const targetRate = exchangeRates[cur] ?? 83.5;
    converted = usdValue * targetRate;
  }

  return new Intl.NumberFormat(localeForCurrency(cur), {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 2,
  }).format(converted);
}
