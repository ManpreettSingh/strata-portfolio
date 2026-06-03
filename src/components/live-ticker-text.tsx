import { useLiveTicker } from "@/hooks/use-live-ticker";
import { usd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LiveTickerTextProps {
  symbol: string;
  type: string;
  fallbackPrice: number;
  className?: string;
  options?: Intl.NumberFormatOptions;
}

export function LiveTickerText({ symbol, type, fallbackPrice, className, options }: LiveTickerTextProps) {
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
      {usd(price, options)}
    </span>
  );
}
