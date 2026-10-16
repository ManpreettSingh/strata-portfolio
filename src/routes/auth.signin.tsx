import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { GoogleLogin } from "@react-oauth/google";

export const Route = createFileRoute("/auth/signin")({
  head: () => ({ meta: [{ title: "Sign in - Folio" }] }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Go straight to the dashboard. If this browser holds a signed-out portfolio, the app root asks
  // whether to save it once the account has loaded (see GuestDataPrompt in __root.tsx).
  function proceed() {
    navigate({ to: "/dashboard" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      toast.success("Signed in");
      proceed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-navy">Welcome back.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in to continue to your portfolio.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {error && <div className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">{error}</div>}
        <Field label="Email"><input name="email" type="email" required placeholder="you@domain.com" className="input" /></Field>
        <Field label="Password" right={<button type="button" className="text-xs text-muted-foreground hover:text-foreground">Forgot?</button>}>
          <input name="password" type="password" required className="input" />
        </Field>
        <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
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
                  proceed();
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

    </div>
  );
}

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium">{label}</span>
        {right}
      </div>
      {children}
    </label>
  );
}
