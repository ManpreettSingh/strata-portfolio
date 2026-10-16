import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export function DeltaPill({ delta, label, className }: { delta: number; label?: string; className?: string }) {
  const positive = delta >= 0;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium num", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
          positive ? "bg-success/12 text-gain" : "bg-loss/12 text-loss",
        )}
      >
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {positive ? "+" : ""}
        {delta.toFixed(2)}%
      </span>
      {label && <span className="text-muted-foreground font-normal">{label}</span>}
    </span>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  className,
  hero = false,
  footer,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  className?: string;
  /** Larger, brand-tinted treatment for the one number the page is about. */
  hero?: boolean;
  /** Extra line under the delta, e.g. an absolute amount. */
  footer?: ReactNode;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta) && Math.abs(delta) > 0.001;

  return (
    <div
      className={cn(
        hero ? "surface-hero p-6" : "surface-card surface-card-hover p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        {icon && (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      <div
        className={cn(
          "mt-3 font-semibold tracking-tight num text-navy truncate",
          hero ? "text-4xl sm:text-5xl" : "text-2xl",
        )}
      >
        {value}
      </div>
      {hasDelta ? (
        <div className="mt-3">
          <DeltaPill delta={delta!} label={deltaLabel} />
        </div>
      ) : deltaLabel ? (
        <div className="mt-3 text-xs text-muted-foreground truncate">{deltaLabel}</div>
      ) : null}
      {footer && <div className="mt-3 text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
