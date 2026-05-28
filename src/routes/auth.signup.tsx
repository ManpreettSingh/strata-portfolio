import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { GoogleLogin } from "@react-oauth/google";
import { MergeDataDialog } from "@/components/merge-data-dialog";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Create account - Folio" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { register, googleLogin } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  function checkGuestDataAndProceed() {
    const raw = localStorage.getItem("folio.guest.portfolio");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.holdings?.length > 0 || data.watchlist?.length > 0) {
          setMergeOpen(true);
          return;
        }
      } catch {}
    }
    navigate({ to: "/dashboard" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (name.length < 2) setError("Name must be at least 2 characters.");
    else if (!email.includes("@")) setError("Enter a valid email address.");
    else if (password.length < 8) setError("Password must be at least 8 characters.");
    else {
      setLoading(true);
      try {
        await register({ name, email, password });
        toast.success("Account created");
        checkGuestDataAndProceed();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create account.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-navy">Create your account.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Two minutes to set up. No card required.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {error && <div className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">{error}</div>}
        <Field label="Full name"><input name="name" required placeholder="Alex Morgan" className="input" /></Field>
        <Field label="Email"><input name="email" type="email" required placeholder="you@domain.com" className="input" /></Field>
        <Field label="Password"><input name="password" type="password" required placeholder="At least 8 characters" className="input" /></Field>
        <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-3">
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (credentialResponse.credential) {
                try {
                  await googleLogin(credentialResponse.credential);
                  toast.success("Signed in with Google");
                  checkGuestDataAndProceed();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Google authentication failed.");
                }
              }
            }}
            onError={() => {
              toast.error("Google authentication failed.");
            }}
            text="continue_with"
            shape="pill"
          />
        </div>
        <Link to="/dashboard" className="block w-full rounded-full border border-dashed border-border py-2.5 text-center text-sm text-muted-foreground hover:bg-secondary transition-colors">
          Continue as guest
        </Link>
      </div>

      <MergeDataDialog
        open={mergeOpen}
        onOpenChange={(open) => {
          setMergeOpen(open);
          if (!open) navigate({ to: "/dashboard" });
        }}
      />

      <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
        By continuing you agree to Folio's Terms and acknowledge our Privacy Policy.
      </p>
      
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}
