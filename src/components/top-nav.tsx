import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, Search, Bell, User, LogOut, Settings, UserCircle } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { SearchDialog } from "@/components/search-dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/markets", label: "Markets" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
] as const;

export function TopNav() {
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = user
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-background">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 17l5-5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display text-xl text-navy">Folio</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors min-w-[200px]"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search assets…</span>
              <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="sm:hidden">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => toast.info("No new notifications")}>
              <Bell className="h-4 w-4" />
            </Button>

            {/* User Dropdown / Sign In */}
            <div className="flex items-center gap-2">
              <div className="auth-only hidden">
                {isAuthenticated && user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors pl-1 pr-3 py-1"
                        aria-label="User menu"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-foreground/20 text-xs font-bold">
                          {initials}
                        </span>
                        <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                          {user.name.split(" ")[0]}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium leading-none">{user.name}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onClick={() => navigate({ to: "/profile" })}
                      >
                        <UserCircle className="h-4 w-4" />
                        My Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onClick={() => navigate({ to: "/settings" })}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 text-loss focus:text-loss"
                        onClick={async () => {
                          await logout();
                          toast.success("Signed out");
                          navigate({ to: "/auth/signin" });
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="guest-only">
                {!isAuthenticated && (
                  <Link
                    to="/auth/signin"
                    className="flex items-center gap-2 rounded-full border border-border bg-secondary hover:bg-accent transition-colors px-4 py-1.5 text-sm font-medium"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign in</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-border overflow-x-auto">
          <div className="flex gap-1 px-4 py-2">
            {navItems.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${
                    active ? "bg-secondary text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
