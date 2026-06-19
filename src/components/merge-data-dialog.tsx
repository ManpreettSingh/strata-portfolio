import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePortfolioData, portfolioActions } from "@/lib/portfolio-store";
import { toast } from "sonner";
import { Package, Trash2 } from "lucide-react";

interface MergeDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MergeDataDialog({ open, onOpenChange }: MergeDataDialogProps) {
  const { holdings, watchlist } = usePortfolioData();
  const holdingsCount = holdings.length;
  const watchlistCount = watchlist.length;
  const hasData = holdingsCount > 0 || watchlistCount > 0;

  if (!hasData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Welcome back!</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
            You have some portfolio data saved from a previous session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Saved Data Found</div>
                <div className="text-xs text-muted-foreground">
                  {holdingsCount} holding{holdingsCount !== 1 ? "s" : ""}
                  {watchlistCount > 0 ? ` · ${watchlistCount} watchlist item${watchlistCount !== 1 ? "s" : ""}` : ""}
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Would you like to keep this data in your dashboard, or start fresh with a clean portfolio?
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-full border-loss text-loss hover:bg-loss/10 hover:text-loss"
            onClick={() => {
              portfolioActions.clearGuestData();
              toast.success("Portfolio cleared. You're starting fresh!");
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Start fresh
          </Button>
          <Button
            className="gap-2 rounded-full"
            onClick={async () => {
              const toastId = toast.loading("Merging your local data to your account...");
              try {
                await portfolioActions.mergeGuestData();
                toast.success("Your saved data has been successfully merged and synced!", { id: toastId });
                onOpenChange(false);
              } catch (err) {
                console.error(err);
                toast.error("Failed to merge guest data with your account.", { id: toastId });
              }
            }}
          >
            <Package className="h-4 w-4" />
            Keep my data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
