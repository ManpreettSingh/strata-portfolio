import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { User, Mail, Shield, Calendar, LogOut, Save } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Folio" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync form state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setDirty(false);
    }
  }, [user?.id]);

  // Redirect guests to sign-in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/auth/signin" });
    }
  }, [isAuthenticated]);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        ...(name !== user!.name ? { name } : {}),
        ...(email !== user!.email ? { email } : {}),
      });
      updateUser(updated);
      setDirty(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await logout();
    toast.success("Signed out");
    navigate({ to: "/auth/signin" });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
        {/* Profile Header */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          <div className="px-6 pb-6 -mt-12">
            <div className="flex items-end gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-card bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
                {initials}
              </div>
              <div className="flex-1 pt-12">
                <h1 className="font-display text-2xl text-navy">{user.name}</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <form onSubmit={handleSave}>
          <Section title="Personal Information" desc="Update your name and email address." icon={<User className="h-4 w-4" />}>
            <Row label="Full name">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setDirty(true); }}
                className="w-full max-w-sm rounded-md border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                placeholder="Your name"
              />
            </Row>
            <Row label="Email address">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setDirty(true); }}
                className="w-full max-w-sm rounded-md border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                placeholder="you@domain.com"
              />
            </Row>
            <div className="px-6 py-4 bg-surface-muted/30">
              <Button
                type="submit"
                disabled={!dirty || saving}
                className="rounded-full gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </Section>
        </form>

        {/* Account Info */}
        <Section title="Account" desc="Your account details and security." icon={<Shield className="h-4 w-4" />}>
          <Row label="Account ID">
            <code className="rounded bg-secondary px-2 py-1 text-xs font-mono text-muted-foreground">{user.id}</code>
          </Row>
          <Row label="Auth method">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Shield className="h-3 w-3" />
              Email & Password
            </span>
          </Row>
        </Section>

        {/* Sign Out */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="font-medium text-loss">Sign out</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign out of your Folio account on this device.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-loss text-loss hover:bg-loss/10 hover:text-loss gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  desc,
  icon,
  children,
}: {
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center gap-3">
        {icon && <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-muted-foreground">{icon}</div>}
        <div>
          <h2 className="font-medium">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 px-6 py-5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
