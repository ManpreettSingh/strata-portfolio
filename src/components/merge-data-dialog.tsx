import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { portfolioActions, guestDataSummary } from "@/lib/portfolio-store";
import { toast } from "sonner";
import { Package, Trash2, Loader2 } from "lucide-react";

interface MergeDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Asks what to do with the portfolio saved in this browser while signed out.
 * Counts come from the saved guest data itself: the live store has already switched to the
 * signed-in account by now, so reading it here would show an empty (or the wrong) portfolio.
 */
export function MergeDataDialog({ open, onOpenChange }: MergeDataDialogProps) {
  const [busy, setBusy] = useState(false);
  const { holdings: holdingsCount, watchlist: watchlistCount } = guestDataSummary();

  if (holdingsCount === 0 && watchlistCount === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Save your local data?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
            You built a portfolio on this device before signing in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Saved on this device</div>
                <div className="text-xs text-muted-foreground">
                  {holdingsCount} holding{holdingsCount !== 1 ? "s" : ""}
                  {watchlistCount > 0 ? ` · ${watchlistCount} watchlist item${watchlistCount !== 1 ? "s" : ""}` : ""}
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Add it to your account so it syncs everywhere, or discard it from this device. Closing this keeps it here
            and we'll ask again next time.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            disabled={busy}
            className="gap-2 rounded-full border-loss text-loss hover:bg-loss/10 hover:text-loss"
            onClick={() => {
              portfolioActions.discardGuestData();
              toast.success("Local data discarded from this device.");
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Discard it
          </Button>
          <Button
            disabled={busy}
            className="gap-2 rounded-full"
            onClick={async () => {
              setBusy(true);
              const toastId = toast.loading("Adding your local data to your account...");
              try {
                await portfolioActions.mergeGuestData();
                toast.success("Your local data is now saved to your account.", { id: toastId });
                onOpenChange(false);
              } catch (err) {
                console.error(err);
                toast.error("Couldn't save everything. Your local data is still on this device; try again.", { id: toastId });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            Save to my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
