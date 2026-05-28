import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta) && Math.abs(delta) > 0.001;
  const positive = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-hover)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        {icon && <div className="text-muted-foreground/70 shrink-0">{icon}</div>}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight num text-navy">{value}</div>
      {hasDelta ? (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 text-xs font-medium num",
            positive ? "text-gain" : "text-loss",
          )}
        >
          {positive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          <span>
            {positive ? "+" : ""}
            {delta!.toFixed(2)}%
          </span>
          {deltaLabel && (
            <span className="text-muted-foreground font-normal">· {deltaLabel}</span>
          )}
        </div>
      ) : deltaLabel ? (
        <div className="mt-2 text-xs text-muted-foreground">{deltaLabel}</div>
      ) : null}
    </div>
  );
}
