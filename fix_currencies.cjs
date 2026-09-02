
const fs = require("fs");
function fixDashboard() {
  let f = fs.readFileSync("src/routes/dashboard.tsx", "utf8");
  
  // Fix allocationData
  f = f.replace(
    /const groups: Record<string, number> = {};\s+for \(const h of liveHoldings\) {\s+const type = h.type.charAt\(0\)\.toUpperCase\(\) \+ h.type\.slice\(1\);\s+groups\[type\] = \(groups\[type\] \|\| 0\) \+ h\.value;\s+}/,
    `const groups: Record<string, number> = {};
    for (const h of liveHoldings) {
      const type = h.type.charAt(0).toUpperCase() + h.type.slice(1);
      const cur = assetCurrency(h.symbol, (h as any).currency);
      groups[type] = (groups[type] || 0) + normalizeToUSD(h.value, cur);
    }`
  );

  // Fix sorted
  f = f.replace(
    /return \[\.\.\.liveHoldings\]\.sort\(\(a, b\) => b\.value - a\.value\);/,
    `return [...liveHoldings].sort((a, b) => {
      const curA = assetCurrency(a.symbol, (a as any).currency);
      const curB = assetCurrency(b.symbol, (b as any).currency);
      return normalizeToUSD(b.value, curB) - normalizeToUSD(a.value, curA);
    });`
  );

  // Fix top performers
  f = f.replace(
    /\{liveHoldings\.sort\(\(a, b\) => b\.pl - a\.pl\)\.slice\(0, 5\)\.map\(\(h\) => \(/,
    `{liveHoldings.sort((a, b) => {
              const curA = assetCurrency(a.symbol, (a as any).currency);
              const curB = assetCurrency(b.symbol, (b as any).currency);
              return normalizeToUSD(b.pl, curB) - normalizeToUSD(a.pl, curA);
            }).slice(0, 5).map((h) => (`
  );

  // Fix AllocationChart
  f = f.replace(
    /acc\[h\.type\] = \(acc\[h\.type\] \?\? 0\) \+ m\.value;/,
    `const cur = assetCurrency(h.symbol, (h as any).currency);
    acc[h.type] = (acc[h.type] ?? 0) + normalizeToUSD(m.value, cur);`
  );

  // Fix HealthScore
  f = f.replace(
    /value: computeMetrics\(h\)\.value,/,
    `value: (() => {
        const m = computeMetrics(h);
        const cur = assetCurrency(h.symbol, (h as any).currency);
        return normalizeToUSD(m.value, cur);
      })(),`
  );

  // Fix ActivityFeed
  f = f.replace(
    /const actCurrency = a\.symbol\.toUpperCase\(\)\.endsWith\("\.NS"\) \|\| a\.symbol\.toUpperCase\(\)\.endsWith\("\.BO"\) \? "INR" : "USD";/g,
    `const actCurrency = assetCurrency(a.symbol);`
  );

  // Imports
  if (!f.includes("normalizeToUSD")) {
    f = f.replace(/import \{ usePortfolioData, computeMetrics, portfolioActions, exchangeRates \} from "@\/lib\/portfolio-store";/, `import { usePortfolioData, computeMetrics, portfolioActions, exchangeRates, assetCurrency, normalizeToUSD } from "@/lib/portfolio-store";`);
  }

  fs.writeFileSync("src/routes/dashboard.tsx", f);
}

function fixPortfolio() {
  let f = fs.readFileSync("src/routes/portfolio.tsx", "utf8");
  f = f.replace(
    /const get = \(h: typeof a, m: typeof ma\) => \(\{ name: h\.name, value: m\.value, pl: m\.pl, plPct: m\.plPct, qty: h\.quantity \}\[sortKey\]\);/,
    `const get = (h: typeof a, m: typeof ma) => {
        const cur = assetCurrency(h.symbol, (h as any).currency);
        return {
          name: h.name,
          value: normalizeToUSD(m.value, cur),
          pl: normalizeToUSD(m.pl, cur),
          plPct: m.plPct,
          qty: h.quantity
        }[sortKey];
      };`
  );
  if (!f.includes("normalizeToUSD")) {
    f = f.replace(/import \{ computeMetrics, portfolioActions, usePortfolioData, assetCurrency, type HoldingInput, type StoredHolding \} from "@\/lib\/portfolio-store";/, `import { computeMetrics, portfolioActions, usePortfolioData, assetCurrency, normalizeToUSD, type HoldingInput, type StoredHolding } from "@/lib/portfolio-store";`);
  }
  fs.writeFileSync("src/routes/portfolio.tsx", f);
}

function fixPortfolioSymbol() {
  let f = fs.readFileSync("src/routes/portfolio.$symbol.tsx", "utf8");
  f = f.replace(
    /const allocation = s\.value > 0 \? \(m\.value \/ s\.value\) \* 100 : 0;/,
    `const allocation = s.value > 0 ? (normalizeToUSD(m.value, currency) / s.value) * 100 : 0;`
  );
  if (!f.includes("normalizeToUSD")) {
    f = f.replace(/import \{ computeMetrics, portfolioActions, portfolioSummary, usePortfolioData, assetCurrency \} from "@\/lib\/portfolio-store";/, `import { computeMetrics, portfolioActions, portfolioSummary, usePortfolioData, assetCurrency, normalizeToUSD } from "@/lib/portfolio-store";`);
  }
  fs.writeFileSync("src/routes/portfolio.$symbol.tsx", f);
}

function fixWatchlist() {
  let f = fs.readFileSync("src/routes/watchlist.tsx", "utf8");
  f = f.replace(
    /\{usd\(price\)\}/,
    `{usd(price, { fromCurrency: assetCurrency(item.symbol, item.currency) })}`
  );
  fs.writeFileSync("src/routes/watchlist.tsx", f);
}

fixDashboard();
fixPortfolio();
fixPortfolioSymbol();
fixWatchlist();
console.log("Done.");

