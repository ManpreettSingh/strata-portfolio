import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const CRYPTO_SYMBOLS = new Set([
  "BTC", "ETH", "SOL", "ADA", "XRP", "DOT", "DOGE", "SHIB", "AVAX", "LINK", 
  "MATIC", "LTC", "UNI", "XLM", "ATOM", "NEAR", "OP", "ARB", "RENDER", "RNDR",
  "USDT", "USDC", "BNB", "TRX", "TON"
]);

const STOCK_DOMAINS: Record<string, string> = {
  // Indian Stocks
  "RELIANCE.NS": "ril.com",
  "RELIANCE": "ril.com",
  "TCS.NS": "tcs.com",
  "TCS": "tcs.com",
  "HDFCBANK.NS": "hdfcbank.com",
  "HDFCBANK": "hdfcbank.com",
  "HDFC.NS": "hdfcbank.com",
  "HDFC": "hdfcbank.com",
  "INFY.NS": "infosys.com",
  "INFY": "infosys.com",
  "ICICIBANK.NS": "icicibank.com",
  "ICICIBANK": "icicibank.com",
  "TATAPOWER.NS": "tatapower.com",
  "TATAPOWER": "tatapower.com",
  "SBIN.NS": "sbi.co.in",
  "SBIN": "sbi.co.in",
  "ITC.NS": "itcportal.com",
  "ITC": "itcportal.com",
  "BHARTIALRT.NS": "airtel.in",
  "BHARTIALRT": "airtel.in",
  "LT.NS": "larsentoubro.com",
  "LT": "larsentoubro.com",
  "TATAMOTORS.NS": "tatamotors.com",
  "TATAMOTORS": "tatamotors.com",
  "WIPRO.NS": "wipro.com",
  "WIPRO": "wipro.com",
  "HCLTECH.NS": "hcltech.com",
  "HCLTECH": "hcltech.com",
  "MARUTI.NS": "marutisuzuki.com",
  "MARUTI": "marutisuzuki.com",
  "SUNPHARMA.NS": "sunpharma.com",
  "SUNPHARMA": "sunpharma.com",
  "ADANIENT.NS": "adani.com",
  "ADANIENT": "adani.com",
  "NTPC.NS": "ntpc.co.in",
  "NTPC": "ntpc.co.in",
  "ONGC.NS": "ongcindia.com",
  "ONGC": "ongcindia.com",
  "COALINDIA.NS": "coalindia.in",
  "COALINDIA": "coalindia.in",
  "AXISBANK.NS": "axisbank.com",
  "AXISBANK": "axisbank.com",
  "BAJFINANCE.NS": "bajajfinserv.in",
  "BAJFINANCE": "bajajfinserv.in",

  // US Stocks
  "AAPL": "apple.com",
  "MSFT": "microsoft.com",
  "NVDA": "nvidia.com",
  "GOOGL": "google.com",
  "GOOG": "google.com",
  "AMZN": "amazon.com",
  "META": "meta.com",
  "TSLA": "tesla.com",
  "NFLX": "netflix.com",
  "AMD": "amd.com",
  "COIN": "coinbase.com",
  "GS": "goldmansachs.com",
  "JPM": "jpmorganchase.com",
  "DIS": "disney.com",
  "V": "visa.com",
  "MA": "mastercard.com",
  "WMT": "walmart.com",
  "PG": "pg.com",
  "JNJ": "jnj.com",
  "INTC": "intel.com",
  "PYPL": "paypal.com",
  "NKE": "nike.com",
  "SBUX": "starbucks.com",

  // Indices & Commodities
  "^NSEI": "nseindia.com",
  "^BSESN": "bseindia.com",
  "^GSPC": "spglobal.com",
  "^IXIC": "nasdaq.com",
  "^DJI": "dowjones.com",
  "^NSEBANK": "nseindia.com",
  "GC=F": "gold.org",
  "SI=F": "silverinstitute.org"
};

export function AssetIcon({
  symbol,
  color,
  type,
  className
}: {
  symbol: string;
  color?: string;
  type?: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if symbol changes
  useEffect(() => {
    setImgError(false);
  }, [symbol]);

  const upper = symbol.toUpperCase().trim();
  const cleanSym = upper.replace(/\^/g, "").replace(/=F/g, "").split(".")[0];

  let logoUrl = "";

  // Determine if crypto or stock to get appropriate CDN URL
  const isCrypto = type?.toLowerCase() === "crypto" || CRYPTO_SYMBOLS.has(cleanSym) || (!upper.includes(".") && !upper.startsWith("^") && !upper.endsWith("=F") && CRYPTO_SYMBOLS.has(upper));

  if (isCrypto) {
    logoUrl = `https://assets.coincap.io/assets/icons/${cleanSym.toLowerCase()}@2x.png`;
  } else {
    const domain = STOCK_DOMAINS[upper] || STOCK_DOMAINS[cleanSym];
    if (domain) {
      logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    } else if (!upper.startsWith("^") && !upper.endsWith("=F")) {
      // Guess domain for generic stock symbol
      logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${cleanSym.toLowerCase()}.com`;
    }
  }

  return (
    <div
      className={cn(
        "grid place-items-center rounded-full text-[11px] font-bold text-white shrink-0 overflow-hidden bg-muted",
        className ?? "h-8 w-8"
      )}
      style={{ backgroundColor: color ?? "#0f172a" }}
    >
      {!imgError && logoUrl ? (
        <img
          src={logoUrl}
          onError={() => setImgError(true)}
          alt={symbol}
          className="h-full w-full object-contain rounded-full bg-white p-0.5"
        />
      ) : (
        symbol.replace(/\^/g, "").slice(0, 2)
      )}
    </div>
  );
}
