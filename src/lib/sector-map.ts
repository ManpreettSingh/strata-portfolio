/**
 * sector-map.ts — Client-side inference for sector and region data.
 *
 * The backend Asset model has sector/region fields but they are usually null.
 * This module infers sector and region from the symbol, name, and asset type
 * so charts display meaningful data immediately.
 */

/* ── Known Symbol → Sector Map ── */
const SYMBOL_SECTOR: Record<string, string> = {
  // Indian Stocks — Energy
  RELIANCE: "Energy", "RELIANCE.NS": "Energy", "RELIANCE.BO": "Energy",
  ONGC: "Energy", "ONGC.NS": "Energy", BPCL: "Energy", "BPCL.NS": "Energy",
  IOC: "Energy", "IOC.NS": "Energy", GAIL: "Energy", "GAIL.NS": "Energy",
  NTPC: "Energy", "NTPC.NS": "Energy", POWERGRID: "Energy", "POWERGRID.NS": "Energy",
  ADANIGREEN: "Energy", "ADANIGREEN.NS": "Energy", ADANIPOWER: "Energy",
  TATAPOWER: "Energy", "TATAPOWER.NS": "Energy",

  // Indian Stocks — Technology / IT
  TCS: "Technology", "TCS.NS": "Technology", "TCS.BO": "Technology",
  INFY: "Technology", "INFY.NS": "Technology", "INFY.BO": "Technology",
  WIPRO: "Technology", "WIPRO.NS": "Technology",
  HCLTECH: "Technology", "HCLTECH.NS": "Technology",
  TECHM: "Technology", "TECHM.NS": "Technology",
  LTIM: "Technology", "LTIM.NS": "Technology",
  PERSISTENT: "Technology", "PERSISTENT.NS": "Technology",
  COFORGE: "Technology", "COFORGE.NS": "Technology",
  MPHASIS: "Technology", "MPHASIS.NS": "Technology",

  // Indian Stocks — Banking
  HDFCBANK: "Banking", "HDFCBANK.NS": "Banking", "HDFCBANK.BO": "Banking",
  ICICIBANK: "Banking", "ICICIBANK.NS": "Banking", "ICICIBANK.BO": "Banking",
  SBIN: "Banking", "SBIN.NS": "Banking",
  KOTAKBANK: "Banking", "KOTAKBANK.NS": "Banking",
  AXISBANK: "Banking", "AXISBANK.NS": "Banking",
  INDUSINDBK: "Banking", "INDUSINDBK.NS": "Banking",
  BANKBARODA: "Banking", "BANKBARODA.NS": "Banking",
  PNB: "Banking", "PNB.NS": "Banking",
  IDFCFIRSTB: "Banking", "IDFCFIRSTB.NS": "Banking",
  FEDERALBNK: "Banking", "FEDERALBNK.NS": "Banking",
  BANDHANBNK: "Banking", "BANDHANBNK.NS": "Banking",

  // Indian Stocks — Finance / NBFC
  BAJFINANCE: "Finance", "BAJFINANCE.NS": "Finance",
  BAJAJFINSV: "Finance", "BAJAJFINSV.NS": "Finance",
  HDFC: "Finance", "HDFC.NS": "Finance",
  SBILIFE: "Finance", "SBILIFE.NS": "Finance",
  HDFCLIFE: "Finance", "HDFCLIFE.NS": "Finance",
  ICICIGI: "Finance", "ICICIGI.NS": "Finance",
  ICICIPRULI: "Finance", "ICICIPRULI.NS": "Finance",
  MUTHOOTFIN: "Finance", "MUTHOOTFIN.NS": "Finance",
  CHOLAFIN: "Finance", "CHOLAFIN.NS": "Finance",
  M_MFIN: "Finance", "M&MFIN.NS": "Finance",
  SHRIRAMFIN: "Finance", "SHRIRAMFIN.NS": "Finance",

  // Indian Stocks — Automobile
  TATAMOTORS: "Automobile", "TATAMOTORS.NS": "Automobile",
  MARUTI: "Automobile", "MARUTI.NS": "Automobile",
  M_M: "Automobile", "M&M.NS": "Automobile",
  BAJAJ_AUTO: "Automobile", "BAJAJ-AUTO.NS": "Automobile",
  EICHERMOT: "Automobile", "EICHERMOT.NS": "Automobile",
  HEROMOTOCO: "Automobile", "HEROMOTOCO.NS": "Automobile",
  ASHOKLEY: "Automobile", "ASHOKLEY.NS": "Automobile",
  TVSMOTOR: "Automobile", "TVSMOTOR.NS": "Automobile",

  // Indian Stocks — FMCG
  HINDUNILVR: "FMCG", "HINDUNILVR.NS": "FMCG",
  ITC: "FMCG", "ITC.NS": "FMCG",
  NESTLEIND: "FMCG", "NESTLEIND.NS": "FMCG",
  BRITANNIA: "FMCG", "BRITANNIA.NS": "FMCG",
  DABUR: "FMCG", "DABUR.NS": "FMCG",
  MARICO: "FMCG", "MARICO.NS": "FMCG",
  GODREJCP: "FMCG", "GODREJCP.NS": "FMCG",
  COLPAL: "FMCG", "COLPAL.NS": "FMCG",
  TATACONSUM: "FMCG", "TATACONSUM.NS": "FMCG",

  // Indian Stocks — Healthcare / Pharma
  SUNPHARMA: "Healthcare", "SUNPHARMA.NS": "Healthcare",
  DRREDDY: "Healthcare", "DRREDDY.NS": "Healthcare",
  CIPLA: "Healthcare", "CIPLA.NS": "Healthcare",
  DIVISLAB: "Healthcare", "DIVISLAB.NS": "Healthcare",
  APOLLOHOSP: "Healthcare", "APOLLOHOSP.NS": "Healthcare",
  FORTIS: "Healthcare", "FORTIS.NS": "Healthcare",
  BIOCON: "Healthcare", "BIOCON.NS": "Healthcare",
  LALPATHLAB: "Healthcare", "LALPATHLAB.NS": "Healthcare",
  AUROPHARMA: "Healthcare", "AUROPHARMA.NS": "Healthcare",

  // Indian Stocks — Telecom
  BHARTIARTL: "Telecom", "BHARTIARTL.NS": "Telecom",
  IDEA: "Telecom", "IDEA.NS": "Telecom",

  // Indian Stocks — Metals & Mining
  TATASTEEL: "Metals", "TATASTEEL.NS": "Metals",
  JSWSTEEL: "Metals", "JSWSTEEL.NS": "Metals",
  HINDALCO: "Metals", "HINDALCO.NS": "Metals",
  VEDL: "Metals", "VEDL.NS": "Metals",
  COALINDIA: "Metals", "COALINDIA.NS": "Metals",
  NMDC: "Metals", "NMDC.NS": "Metals",

  // Indian Stocks — Infrastructure / Real Estate
  LT: "Infrastructure", "LT.NS": "Infrastructure",
  ADANIENT: "Infrastructure", "ADANIENT.NS": "Infrastructure",
  ADANIPORTS: "Infrastructure", "ADANIPORTS.NS": "Infrastructure",
  DLF: "Real Estate", "DLF.NS": "Real Estate",
  GODREJPROP: "Real Estate", "GODREJPROP.NS": "Real Estate",

  // Indian Stocks — Cement
  ULTRACEMCO: "Cement", "ULTRACEMCO.NS": "Cement",
  SHREECEM: "Cement", "SHREECEM.NS": "Cement",
  AMBUJACEM: "Cement", "AMBUJACEM.NS": "Cement",
  ACC: "Cement", "ACC.NS": "Cement",

  // Indian Indices
  "^NSEI": "Index", "^NIFTY": "Index", "^BSESN": "Index",
  NIFTY_50: "Index",

  // US Stocks — Technology
  AAPL: "Technology", MSFT: "Technology", GOOGL: "Technology", GOOG: "Technology",
  AMZN: "Technology", META: "Technology", NVDA: "Technology", TSLA: "Technology",
  NFLX: "Technology", ADBE: "Technology", CRM: "Technology", ORCL: "Technology",
  INTC: "Technology", AMD: "Technology", PYPL: "Technology", SQ: "Technology",
  SHOP: "Technology", UBER: "Technology", SNAP: "Technology", PLTR: "Technology",
  SNOW: "Technology", COIN: "Technology", RBLX: "Technology",

  // US Stocks — Finance
  JPM: "Finance", BAC: "Finance", WFC: "Finance", GS: "Finance",
  MS: "Finance", V: "Finance", MA: "Finance", AXP: "Finance",
  BRK_B: "Finance", "BRK-B": "Finance",

  // US Stocks — Healthcare
  JNJ: "Healthcare", PFE: "Healthcare", UNH: "Healthcare", ABBV: "Healthcare",
  MRK: "Healthcare", LLY: "Healthcare", TMO: "Healthcare", ABT: "Healthcare",

  // US Stocks — Consumer
  WMT: "Consumer", KO: "Consumer", PEP: "Consumer", PG: "Consumer",
  COST: "Consumer", NKE: "Consumer", SBUX: "Consumer", MCD: "Consumer",
  DIS: "Consumer",

  // US Stocks — Energy
  XOM: "Energy", CVX: "Energy",

  // Crypto
  BTC: "Crypto", "BTC-USD": "Crypto", ETH: "Crypto", "ETH-USD": "Crypto",
  SOL: "Crypto", "SOL-USD": "Crypto", DOGE: "Crypto", "DOGE-USD": "Crypto",
  LINK: "Crypto", "LINK-USD": "Crypto", ADA: "Crypto", "ADA-USD": "Crypto",
  DOT: "Crypto", "DOT-USD": "Crypto", AVAX: "Crypto", "AVAX-USD": "Crypto",
  MATIC: "Crypto", "MATIC-USD": "Crypto", XRP: "Crypto", "XRP-USD": "Crypto",
  ATOM: "Crypto", "ATOM-USD": "Crypto", UNI: "Crypto", "UNI-USD": "Crypto",
  LTC: "Crypto", "LTC-USD": "Crypto", SHIB: "Crypto", "SHIB-USD": "Crypto",
  BNB: "Crypto", "BNB-USD": "Crypto", TRX: "Crypto", "TRX-USD": "Crypto",
  NEAR: "Crypto", "NEAR-USD": "Crypto", APT: "Crypto", "APT-USD": "Crypto",
  ARB: "Crypto", "ARB-USD": "Crypto", OP: "Crypto", "OP-USD": "Crypto",
  SUI: "Crypto", "SUI-USD": "Crypto", PEPE: "Crypto", "PEPE-USD": "Crypto",
  FET: "Crypto", "FET-USD": "Crypto", INJ: "Crypto", "INJ-USD": "Crypto",
  RENDER: "Crypto", "RENDER-USD": "Crypto",

  // Gold & Commodities
  GC: "Commodity", "GC=F": "Commodity", GLD: "Commodity",
  SLV: "Commodity", SI: "Commodity", "SI=F": "Commodity",
  CL: "Commodity", "CL=F": "Commodity",

  // ETFs
  SPY: "ETF", QQQ: "ETF", VTI: "ETF", VOO: "ETF", IVV: "ETF",
  DIA: "ETF", IWM: "ETF", VEA: "ETF", VWO: "ETF", EEM: "ETF",
  ARKK: "ETF", ARKG: "ETF",
};

/* ── Known Symbol → Region Map ── */
const SYMBOL_REGION: Record<string, string> = {
  // Crypto is global
  BTC: "Global", ETH: "Global", SOL: "Global", DOGE: "Global", LINK: "Global",
  ADA: "Global", DOT: "Global", AVAX: "Global", MATIC: "Global", XRP: "Global",
  ATOM: "Global", UNI: "Global", LTC: "Global", SHIB: "Global", BNB: "Global",
  TRX: "Global", NEAR: "Global", APT: "Global", ARB: "Global", OP: "Global",
  SUI: "Global", PEPE: "Global", FET: "Global", INJ: "Global", RENDER: "Global",
  "BTC-USD": "Global", "ETH-USD": "Global", "SOL-USD": "Global",
  "DOGE-USD": "Global", "LINK-USD": "Global", "ADA-USD": "Global",
  "DOT-USD": "Global", "AVAX-USD": "Global", "MATIC-USD": "Global",
  "XRP-USD": "Global", "ATOM-USD": "Global", "UNI-USD": "Global",
  "LTC-USD": "Global", "SHIB-USD": "Global", "BNB-USD": "Global",

  // US Stocks
  AAPL: "USA", MSFT: "USA", GOOGL: "USA", GOOG: "USA",
  AMZN: "USA", META: "USA", NVDA: "USA", TSLA: "USA",
  NFLX: "USA", ADBE: "USA", CRM: "USA", ORCL: "USA",
  INTC: "USA", AMD: "USA", JPM: "USA", BAC: "USA",
  WFC: "USA", GS: "USA", MS: "USA", V: "USA", MA: "USA",
  JNJ: "USA", PFE: "USA", UNH: "USA", WMT: "USA",
  KO: "USA", PEP: "USA", PG: "USA", DIS: "USA",
  XOM: "USA", CVX: "USA", SPY: "USA", QQQ: "USA",
  VTI: "USA", VOO: "USA",

  // Indian Stocks — explicit
  RELIANCE: "India", TCS: "India", INFY: "India", HDFCBANK: "India",
  ICICIBANK: "India", SBIN: "India", KOTAKBANK: "India", AXISBANK: "India",
  BAJFINANCE: "India", BAJAJFINSV: "India", HINDUNILVR: "India",
  ITC: "India", BHARTIARTL: "India", TATAMOTORS: "India", MARUTI: "India",
  SUNPHARMA: "India", DRREDDY: "India", CIPLA: "India", TATASTEEL: "India",
  LT: "India", ADANIENT: "India", ADANIPORTS: "India", NTPC: "India",
  POWERGRID: "India", ULTRACEMCO: "India", WIPRO: "India", HCLTECH: "India",
  TECHM: "India", NESTLEIND: "India", BRITANNIA: "India", COALINDIA: "India",
  JSWSTEEL: "India", HINDALCO: "India", ONGC: "India", BPCL: "India",
  IOC: "India", GAIL: "India", DLF: "India", ACC: "India",
  SHREECEM: "India", AMBUJACEM: "India", APOLLOHOSP: "India",
  DIVISLAB: "India", TATACONSUM: "India", TATAPOWER: "India",
  GODREJCP: "India", DABUR: "India", MARICO: "India", COLPAL: "India",
  HDFC: "India", IDEA: "India", VEDL: "India", NMDC: "India",
  EICHERMOT: "India", HEROMOTOCO: "India", PNB: "India", BANKBARODA: "India",
  IDFCFIRSTB: "India", FEDERALBNK: "India", BANDHANBNK: "India",
  INDUSINDBK: "India", FORTIS: "India", BIOCON: "India", LALPATHLAB: "India",
  AUROPHARMA: "India", SBILIFE: "India", HDFCLIFE: "India", ICICIGI: "India",
  ICICIPRULI: "India", MUTHOOTFIN: "India", CHOLAFIN: "India",
  SHRIRAMFIN: "India", GODREJPROP: "India", LTIM: "India",
  PERSISTENT: "India", COFORGE: "India", MPHASIS: "India",
  ADANIGREEN: "India", ADANIPOWER: "India", TVSMOTOR: "India",
};

/* ── Name-based Keywords → Sector Inference ── */
const NAME_SECTOR_KEYWORDS: [RegExp, string][] = [
  [/\b(bank|banking|credit)\b/i, "Banking"],
  [/\b(financ|nbfc|capital|invest|fund|insurance|life|finsv)\b/i, "Finance"],
  [/\b(tech|software|info|digital|cloud|data|ai|cyber|saas|it)\b/i, "Technology"],
  [/\b(pharma|health|hospital|medic|bio|diag|lab|care)\b/i, "Healthcare"],
  [/\b(energy|oil|gas|petrol|power|solar|wind|renew|electric)\b/i, "Energy"],
  [/\b(auto|motor|vehicle|car|bike|ev)\b/i, "Automobile"],
  [/\b(fmcg|consumer|food|beverage|personal|home|soap|shampoo)\b/i, "FMCG"],
  [/\b(telecom|communication|mobile|network|5g|airtel|jio)\b/i, "Telecom"],
  [/\b(metal|steel|iron|alumin|mining|coal|copper|zinc)\b/i, "Metals"],
  [/\b(cement|concrete|building|construct)\b/i, "Cement"],
  [/\b(infra|port|airport|road|rail|logistic)\b/i, "Infrastructure"],
  [/\b(real estate|realty|property|housing)\b/i, "Real Estate"],
  [/\b(gold|silver|commodit|crude|platinum)\b/i, "Commodity"],
  [/\b(etf|index|nifty|sensex|s&p|nasdaq|dow)\b/i, "ETF"],
];

/**
 * Infer the sector for a holding based on its symbol, name, and type.
 * Priority: explicit symbol map → name keyword matching → type-based fallback.
 */
export function inferSector(
  symbol: string,
  name: string,
  type: string,
  existingSector?: string | null,
): string {
  // If backend already has a real sector, use it
  if (existingSector && existingSector !== "Crypto" && existingSector !== "Other") {
    return existingSector;
  }

  const sym = symbol.toUpperCase().replace(/\.NS$|\.BO$/, "");

  // 1. Exact symbol lookup (with and without suffix)
  if (SYMBOL_SECTOR[symbol.toUpperCase()]) return SYMBOL_SECTOR[symbol.toUpperCase()];
  if (SYMBOL_SECTOR[sym]) return SYMBOL_SECTOR[sym];

  // 2. Type-based for crypto (always correct)
  if (type.toLowerCase() === "crypto") return "Crypto";

  // 3. Name-based keyword matching
  for (const [regex, sector] of NAME_SECTOR_KEYWORDS) {
    if (regex.test(name)) return sector;
  }

  // 4. Type-based fallback
  const t = type.toLowerCase();
  if (t === "etf") return "ETF";
  if (t === "mutual_fund") return "Mutual Fund";
  if (t === "index") return "Index";
  if (t === "commodity") return "Commodity";

  return "Other";
}

/**
 * Infer the geographic region for a holding based on its symbol, name, and type.
 * Priority: explicit symbol map → suffix inference → type-based fallback.
 */
export function inferRegion(
  symbol: string,
  _name: string,
  type: string,
  existingRegion?: string | null,
): string {
  // If backend already has a real region, use it
  if (existingRegion && existingRegion !== "Global" && existingRegion !== "Other") {
    return existingRegion;
  }

  const upperSym = symbol.toUpperCase();
  const baseSym = upperSym.replace(/\.NS$|\.BO$/, "");

  // 1. Exact symbol lookup
  if (SYMBOL_REGION[upperSym]) return SYMBOL_REGION[upperSym];
  if (SYMBOL_REGION[baseSym]) return SYMBOL_REGION[baseSym];

  // 2. Suffix-based inference
  if (upperSym.endsWith(".NS") || upperSym.endsWith(".BO")) return "India";
  if (upperSym.endsWith(".L") || upperSym.endsWith(".LON")) return "UK";
  if (upperSym.endsWith(".T") || upperSym.endsWith(".TYO")) return "Japan";
  if (upperSym.endsWith(".HK")) return "Hong Kong";
  if (upperSym.endsWith(".SS") || upperSym.endsWith(".SZ")) return "China";
  if (upperSym.endsWith(".DE") || upperSym.endsWith(".F")) return "Europe";
  if (upperSym.endsWith(".PA")) return "Europe";
  if (upperSym.endsWith(".AS")) return "Europe";
  if (upperSym.endsWith(".TO") || upperSym.endsWith(".V")) return "Canada";
  if (upperSym.endsWith(".AX")) return "Australia";

  // 3. Type-based fallback
  if (type.toLowerCase() === "crypto") return "Global";

  // 4. Default to USA for unrecognized symbols (most likely US stocks)
  return "USA";
}
