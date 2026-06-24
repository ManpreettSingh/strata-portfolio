export type AssetType = "stock" | "crypto" | "etf" | "mutual_fund" | "index" | "commodity";

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  icon: string; // single letter or emoji
  color: string; // tailwind-ish color hex for icon bg
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  dayChangePct: number;
  sector?: string;
  region?: string;
}

export const holdings: Holding[] = [
  { id: "1", symbol: "BTC", name: "Bitcoin", type: "crypto", icon: "₿", color: "#f7931a", quantity: 0.482, avgPrice: 38400, currentPrice: 67230, dayChangePct: -1.12, sector: "Crypto", region: "Global" },
  { id: "2", symbol: "ETH", name: "Ethereum", type: "crypto", icon: "Ξ", color: "#627eea", quantity: 4.2, avgPrice: 2150, currentPrice: 3480, dayChangePct: -0.55, sector: "Crypto", region: "Global" },
  { id: "3", symbol: "SOL", name: "Solana", type: "crypto", icon: "◎", color: "#9945ff", quantity: 38, avgPrice: 78.2, currentPrice: 168.4, dayChangePct: 3.12, sector: "Crypto", region: "Global" },
  { id: "4", symbol: "RELIANCE", name: "Reliance Industries", type: "stock", icon: "R", color: "#0052cc", quantity: 15, avgPrice: 2450, currentPrice: 2680, dayChangePct: 0.85, sector: "Energy", region: "India" },
  { id: "5", symbol: "TCS", name: "Tata Consultancy Services", type: "stock", icon: "T", color: "#0077b6", quantity: 10, avgPrice: 3720, currentPrice: 3890, dayChangePct: 1.25, sector: "IT", region: "India" },
  { id: "6", symbol: "INFY", name: "Infosys", type: "stock", icon: "I", color: "#007cc3", quantity: 25, avgPrice: 1520, currentPrice: 1645, dayChangePct: 0.65, sector: "IT", region: "India" },
  { id: "7", symbol: "DOGE", name: "Dogecoin", type: "crypto", icon: "Ð", color: "#c2a633", quantity: 15000, avgPrice: 0.085, currentPrice: 0.158, dayChangePct: -1.84, sector: "Crypto", region: "Global" },
  { id: "8", symbol: "LINK", name: "Chainlink", type: "crypto", icon: "⬡", color: "#375bd2", quantity: 120, avgPrice: 12.4, currentPrice: 15.6, dayChangePct: 2.34, sector: "Crypto", region: "Global" },
];

export function computeMetrics(h: Holding) {
  const invested = h.quantity * h.avgPrice;
  const value = h.quantity * h.currentPrice;
  const pl = value - invested;
  const plPct = (pl / invested) * 100;
  return { invested, value, pl, plPct };
}

export function portfolioSummary() {
  let invested = 0, value = 0, dayChange = 0;
  for (const h of holdings) {
    const m = computeMetrics(h);
    invested += m.invested;
    value += m.value;
    dayChange += m.value * (h.dayChangePct / 100);
  }
  const totalPL = value - invested;
  const totalPLPct = (totalPL / invested) * 100;
  const dayChangePct = (dayChange / (value - dayChange)) * 100;
  return { invested, value, totalPL, totalPLPct, dayChange, dayChangePct, count: holdings.length };
}

// Generate realistic-looking growth chart data
export function portfolioHistory(days = 180, end = 165000) {
  const data: { date: string; value: number }[] = [];
  const today = new Date();

  if (days === 1) {
    // Hourly data for 1D chart (last 24 hours)
    let v = end * 0.98;
    for (let i = 24; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 60 * 60 * 1000);
      const drift = (end - v) / (i + 1);
      const noise = (Math.sin(i * 0.5) + Math.cos(i * 0.2)) * (end * 0.002);
      v = Math.max(end * 0.9, v + drift + noise);
      const formattedTime = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      data.push({ date: formattedTime, value: Math.round(v) });
    }
    data[data.length - 1].value = end;
    return data;
  }

  let v = end * 0.72;
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const drift = (end - v) / (i + 1);
    const noise = (Math.sin(i * 0.3) + Math.cos(i * 0.13)) * (end * 0.008);
    v = Math.max(end * 0.5, v + drift + noise);
    data.push({ date: d.toISOString().slice(0, 10), value: Math.round(v) });
  }
  data[data.length - 1].value = end;
  return data;
}

export function sparkline(seed: number, points = 24) {
  const arr: { i: number; v: number }[] = [];
  let v = 100;
  for (let i = 0; i < points; i++) {
    v += Math.sin(i * 0.7 + seed) * 3 + (Math.random() - 0.5) * 2;
    arr.push({ i, v });
  }
  return arr;
}

export const watchlist = [
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1685, change: 0.65, icon: "H", color: "#004c8f" },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1125, change: 1.12, icon: "I", color: "#f58220" },
  { symbol: "MATIC", name: "Polygon", price: 0.62, change: -1.14, icon: "P", color: "#8247e5" },
  { symbol: "LTC", name: "Litecoin", price: 78.4, change: -0.84, icon: "Ł", color: "#bfbfbf" },
  { symbol: "UNI", name: "Uniswap", price: 7.82, change: 4.12, icon: "U", color: "#ff007a" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 6825, change: 0.85, icon: "B", color: "#003d6a" },
];

export const recentActivity = [
  { id: "a1", type: "Buy", symbol: "SOL", amount: 10, price: 162.2, time: "2h ago" },
  { id: "a2", type: "Buy", symbol: "BTC", amount: 0.02, price: 66840, time: "Yesterday" },
  { id: "a3", type: "Sell", symbol: "DOGE", amount: 2000, price: 0.162, time: "2d ago" },
  { id: "a4", type: "Buy", symbol: "ETH", amount: 0.5, price: 3410, time: "4d ago" },
  { id: "a5", type: "Buy", symbol: "LINK", amount: 15, price: 14.8, time: "1w ago" },
];
