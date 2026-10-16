import { marketApi } from "./api-client";

type TickerUpdate = {
  price: number;
  changePercent: number;
};

type Listener = (update: TickerUpdate) => void;

class LivePriceSocket {
  // ─── Binance Crypto WebSocket ───────────────────────────────────────
  private cryptoWs: WebSocket | null = null;
  private cryptoUrl = "wss://stream.binance.com:9443/stream";
  private cryptoListeners = new Map<string, Set<Listener>>();
  private cryptoSubscribedStreams = new Set<string>();
  private cryptoReconnectTimeout: any = null;
  private cryptoNextId = 1;

  // ─── Backend Stock WebSocket Relay ──────────────────────────────────
  private stockWs: WebSocket | null = null;
  private stockListeners = new Map<string, Set<Listener>>();
  private stockSubscribedSymbols = new Set<string>();
  private stockReconnectTimeout: any = null;

  // ─── REST Fallback Polling ──────────────────────────────────────────
  // Keeps prices moving even when a WebSocket can't connect (e.g. Binance
  // blocked on the network, or the backend /stocks relay is unreachable).
  private activeSubs = new Map<string, { symbol: string; type: string }>();
  private lastTick = new Map<string, number>();
  private fallbackPollTimer: ReturnType<typeof setInterval> | null = null;

  private getStockUrl() {
    const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
    return base.replace(/^http/, "ws") + "/stocks";
  }

  // ─── Crypto Socket Connection ───────────────────────────────────────
  private connectCrypto() {
    if (this.cryptoWs || typeof window === "undefined") return;

    console.log("[LivePriceSocket] Connecting to Binance WebSocket...");
    this.cryptoWs = new WebSocket(this.cryptoUrl);

    this.cryptoWs.onopen = () => {
      console.log("[LivePriceSocket] Binance WebSocket connected.");

      if (this.cryptoSubscribedStreams.size > 0) {
        this.sendCryptoJSON({
          method: "SUBSCRIBE",
          params: Array.from(this.cryptoSubscribedStreams),
          id: this.cryptoNextId++,
        });
      }
    };

    this.cryptoWs.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.stream && payload.data) {
          const streamName = payload.stream;
          const price = parseFloat(payload.data.c);
          const changePercent = parseFloat(payload.data.P);

          if (!isNaN(price) && !isNaN(changePercent)) {
            this.lastTick.set(streamName, Date.now());
            const streamListeners = this.cryptoListeners.get(streamName);
            if (streamListeners) {
              streamListeners.forEach((listener) =>
                listener({ price, changePercent })
              );
            }
          }
        }
      } catch (err) {
        // Ignore parsing errors
      }
    };

    this.cryptoWs.onerror = (error) => {
      console.error("[LivePriceSocket] Binance WebSocket error:", error);
    };

    this.cryptoWs.onclose = () => {
      console.log("[LivePriceSocket] Binance WebSocket disconnected. Retrying in 5s...");
      this.cryptoWs = null;
      if (this.cryptoReconnectTimeout) clearTimeout(this.cryptoReconnectTimeout);
      // Only reconnect while something is still subscribed.
      if (this.cryptoSubscribedStreams.size > 0) {
        this.cryptoReconnectTimeout = setTimeout(() => this.connectCrypto(), 5000);
      }
    };
  }

  private sendCryptoJSON(obj: any) {
    if (this.cryptoWs && this.cryptoWs.readyState === WebSocket.OPEN) {
      this.cryptoWs.send(JSON.stringify(obj));
    } else {
      this.connectCrypto();
    }
  }

  // ─── Stock Socket Connection ────────────────────────────────────────
  private connectStock() {
    if (this.stockWs || typeof window === "undefined") return;

    const url = this.getStockUrl();
    console.log(`[LivePriceSocket] Connecting to Backend Stocks WebSocket (${url})...`);
    this.stockWs = new WebSocket(url);

    this.stockWs.onopen = () => {
      console.log("[LivePriceSocket] Backend Stocks WebSocket connected.");

      if (this.stockSubscribedSymbols.size > 0) {
        this.sendStockJSON({
          type: "subscribe",
          symbols: Array.from(this.stockSubscribedSymbols),
        });
      }
    };

    this.stockWs.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.type === "tick" && payload.data) {
          const { symbol, price, changePercent } = payload.data;
          const upperSym = String(symbol).toUpperCase();

          // The server labels each tick with the exact symbol we subscribed to, so match
          // exactly. Matching "X" against "X.NS" mixed USD and INR prices for dual-listed stocks.
          const symListeners = this.stockListeners.get(upperSym);
          if (symListeners) {
            this.lastTick.set(upperSym, Date.now());
            symListeners.forEach(listener => listener({ price, changePercent }));
          }
        }
      } catch (err) {
        // Ignore parsing errors
      }
    };

    this.stockWs.onerror = (error) => {
      console.error("[LivePriceSocket] Backend Stocks WebSocket error:", error);
    };

    this.stockWs.onclose = () => {
      console.log("[LivePriceSocket] Backend Stocks WebSocket disconnected. Retrying in 5s...");
      this.stockWs = null;
      if (this.stockReconnectTimeout) clearTimeout(this.stockReconnectTimeout);
      if (this.stockSubscribedSymbols.size > 0) {
        this.stockReconnectTimeout = setTimeout(() => this.connectStock(), 5000);
      }
    };
  }

  private sendStockJSON(obj: any) {
    if (this.stockWs && this.stockWs.readyState === WebSocket.OPEN) {
      this.stockWs.send(JSON.stringify(obj));
    } else {
      this.connectStock();
    }
  }

  // ─── REST Fallback Polling ──────────────────────────────────────────
  private ensureFallbackPolling() {
    if (typeof window === "undefined" || this.fallbackPollTimer) return;
    this.fallbackPollTimer = setInterval(() => this.runFallbackPoll(), 10000);
  }

  private stopFallbackPolling() {
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer);
      this.fallbackPollTimer = null;
    }
  }

  private getListeners(key: string): Set<Listener> {
    return this.cryptoListeners.get(key) || this.stockListeners.get(key) || new Set();
  }

  private async runFallbackPoll() {
    const staleCutoff = Date.now() - 12000;
    const symbolsToRefresh: string[] = [];
    const seenSymbols = new Set<string>();

    this.activeSubs.forEach((info, key) => {
      const last = this.lastTick.get(key) ?? 0;
      if (last < staleCutoff && !seenSymbols.has(info.symbol)) {
        seenSymbols.add(info.symbol);
        symbolsToRefresh.push(info.symbol);
      }
    });

    if (symbolsToRefresh.length === 0) return;

    try {
      const res = await marketApi.quotes(symbolsToRefresh);
      const now = Date.now();
      (res?.quotes || []).forEach((q) => {
        if (!q || !q.price) return;
        const qSym = q.symbol.toUpperCase();
        this.activeSubs.forEach((info, key) => {
          if (info.symbol.toUpperCase() === qSym) {
            const listeners = this.getListeners(key);
            if (listeners.size === 0) return;
            this.lastTick.set(key, now);
            listeners.forEach((l) => l({ price: q.price, changePercent: q.changePercent ?? 0 }));
          }
        });
      });
    } catch (err) {
      // WebSocket is the primary path; this fallback is best-effort.
    }
  }

  // ─── Public Subscription API ────────────────────────────────────────
  public subscribe(symbol: string, type: string, listener: Listener) {
    const isCrypto = type.toLowerCase() === "crypto";
    const upperSymbol = symbol.toUpperCase().trim();

    if (isCrypto) {
      // Binance stream names must be lowercase and use the bare base asset ("BTC-USD" -> "btc").
      // Binance only quotes USDT pairs, so INR-quoted symbols get no stream and are kept fresh
      // by the REST fallback poll instead (a USDT tick would be shown as rupees).
      // Renamed coins: Binance delisted MATICUSDT (stale price) after Polygon moved to POL.
      const BINANCE_ALIASES: Record<string, string> = { MATIC: "POL" };
      const baseUpper = upperSymbol.replace(/-(USD|INR)$/, "");
      const base = (BINANCE_ALIASES[baseUpper] ?? baseUpper).toLowerCase();
      const onBinance = !upperSymbol.endsWith("-INR");
      const streamName = onBinance ? `${base}usdt@ticker` : `${base}-inr@rest`;

      let streamListeners = this.cryptoListeners.get(streamName);
      if (!streamListeners) {
        streamListeners = new Set();
        this.cryptoListeners.set(streamName, streamListeners);
      }
      streamListeners.add(listener);
      this.activeSubs.set(streamName, { symbol: upperSymbol, type });

      if (onBinance && !this.cryptoSubscribedStreams.has(streamName)) {
        this.cryptoSubscribedStreams.add(streamName);
        this.sendCryptoJSON({
          method: "SUBSCRIBE",
          params: [streamName],
          id: this.cryptoNextId++,
        });
      }

      this.ensureFallbackPolling();

      return () => {
        const listenersSet = this.cryptoListeners.get(streamName);
        if (listenersSet) {
          listenersSet.delete(listener);
          if (listenersSet.size === 0) {
            this.cryptoListeners.delete(streamName);
            this.cryptoSubscribedStreams.delete(streamName);
            this.activeSubs.delete(streamName);
            this.lastTick.delete(streamName);

            if (onBinance) {
              this.sendCryptoJSON({
                method: "UNSUBSCRIBE",
                params: [streamName],
                id: this.cryptoNextId++,
              });
            }
          }
        }
        if (this.activeSubs.size === 0) this.stopFallbackPolling();
      };
    } else {
      // Equities/Stocks
      let symbolListeners = this.stockListeners.get(upperSymbol);
      if (!symbolListeners) {
        symbolListeners = new Set();
        this.stockListeners.set(upperSymbol, symbolListeners);
      }
      symbolListeners.add(listener);
      this.activeSubs.set(upperSymbol, { symbol: upperSymbol, type });

      if (!this.stockSubscribedSymbols.has(upperSymbol)) {
        this.stockSubscribedSymbols.add(upperSymbol);
        this.sendStockJSON({
          type: "subscribe",
          symbols: [upperSymbol],
        });
      }

      this.ensureFallbackPolling();

      return () => {
        const listenersSet = this.stockListeners.get(upperSymbol);
        if (listenersSet) {
          listenersSet.delete(listener);
          if (listenersSet.size === 0) {
            this.stockListeners.delete(upperSymbol);
            this.stockSubscribedSymbols.delete(upperSymbol);
            this.activeSubs.delete(upperSymbol);
            this.lastTick.delete(upperSymbol);

            this.sendStockJSON({
              type: "unsubscribe",
              symbols: [upperSymbol],
            });
          }
        }
        if (this.activeSubs.size === 0) this.stopFallbackPolling();
      };
    }
  }
}

export const livePriceSocket = new LivePriceSocket();