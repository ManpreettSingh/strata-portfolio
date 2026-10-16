import { useLiveTicker } from "@/hooks/use-live-ticker";
import { usd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LiveTickerTextProps {
  symbol: string;
  type: string;
  fallbackPrice: number;
  className?: string;
  options?: Intl.NumberFormatOptions;
  /** Currency the price is quoted in (e.g. "INR" for NSE stocks). Defaults to USD. */
  currency?: string;
}

export function LiveTickerText({ symbol, type, fallbackPrice, className, options, currency }: LiveTickerTextProps) {
  const { price, direction } = useLiveTicker(symbol, type, fallbackPrice);

  return (
    <span
      className={cn(
        "transition-colors duration-500 rounded px-1 py-0.5",
        direction === "up" && "bg-gain/25 text-gain font-medium",
        direction === "down" && "bg-loss/25 text-loss font-medium",
        className
      )}
    >
      {usd(price, { ...options, fromCurrency: currency })}
    </span>
  );
}
