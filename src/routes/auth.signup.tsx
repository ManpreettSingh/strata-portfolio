import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { GoogleLogin } from "@react-oauth/google";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Create account - Folio" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { register, verifyRegistration, resendRegistrationCode, googleLogin } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2 (email code) state. `pendingEmail` being set is what switches the page to the code form.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

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
        const started = await register({ name, email, password });
        setPendingEmail(started.email);
        setCooldown(started.resendAfterSeconds);
        setCode("");
        toast.success(`We emailed a 6-digit code to ${started.email}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create account.");
      } finally {
        setLoading(false);
      }
    }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingEmail) return;
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      await verifyRegistration({ email: pendingEmail, code });
      toast.success("Email verified. Welcome to Folio!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!pendingEmail || cooldown > 0) return;
    setError("");
    try {
      const started = await resendRegistrationCode(pendingEmail);
      setCooldown(started.resendAfterSeconds);
      setCode("");
      toast.success("A new code is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    }
  }

  if (pendingEmail) {
    return (
      <div>
        <h1 className="font-display text-3xl text-navy">Check your email.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{pendingEmail}</span>. It expires in 10 minutes.
        </p>

        <form onSubmit={verify} className="mt-8 space-y-4">
          {error && <div className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">{error}</div>}
          <Field label="Verification code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              placeholder="123456"
              className="input text-center text-2xl tracking-[0.5em] font-mono"
            />
          </Field>
          <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading || code.length !== 6}>
            {loading ? "Verifying..." : "Verify and continue"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              setPendingEmail(null);
              setError("");
            }}
            className="hover:text-foreground"
          >
            Use a different email
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    );
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
          {loading ? "Sending code..." : "Create account"}
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
                  navigate({ to: "/dashboard" });
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
