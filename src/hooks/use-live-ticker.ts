import { useState, useEffect, useRef } from "react";
import { livePriceSocket } from "@/lib/live-price-socket";

export type PriceDirection = "up" | "down" | null;

export function useLiveTicker(symbol: string, type: string, fallbackPrice: number, fallbackChange?: number) {
  const [price, setPrice] = useState(fallbackPrice);
  const [changePercent, setChangePercent] = useState(fallbackChange ?? 0);
  const [direction, setDirection] = useState<PriceDirection>(null);
  const timeoutRef = useRef<any>(null);

  // Update local state when fallbacks change (e.g. REST API fetches new base price)
  useEffect(() => {
    setPrice(fallbackPrice);
    if (fallbackChange !== undefined) {
      setChangePercent(fallbackChange);
    }
  }, [fallbackPrice, fallbackChange]);

  useEffect(() => {
    // Every asset type streams: crypto via Binance, everything else (stocks, indices like ^NSEI,
    // ETFs, commodities) via the backend relay. Filtering by type left indices frozen.
    if (!symbol) return;

    const cleanup = livePriceSocket.subscribe(symbol, type, (update) => {
      setPrice((prevPrice) => {
        if (update.price > prevPrice) {
          setDirection("up");
          triggerDirectionReset();
        } else if (update.price < prevPrice) {
          setDirection("down");
          triggerDirectionReset();
        }
        return update.price;
      });
      setChangePercent(update.changePercent);
    });

    return () => {
      cleanup();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [symbol, type]);

  const triggerDirectionReset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDirection(null);
    }, 1000); // Reset direction status after 1s
  };

  return { price, changePercent, direction };
}
