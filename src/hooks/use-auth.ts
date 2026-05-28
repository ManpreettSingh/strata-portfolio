/**
 * use-auth.ts — Reactive authentication hook.
 *
 * Wraps localStorage-backed auth state in useSyncExternalStore
 * so login/logout automatically re-renders all consumers.
 * SSR-safe: returns null on the server.
 *
 * IMPORTANT: getSnapshot must return a referentially stable value
 * to avoid infinite re-render loops with useSyncExternalStore.
 */

import { useSyncExternalStore, useState, useEffect } from "react";
import { authApi, type AuthUser } from "@/lib/api";

const AUTH_EVENT = "folio:auth-change";
const listeners = new Set<() => void>();

// ── Cached snapshot to ensure referential stability ────────────────
let cachedRaw: string | null = null;
let cachedUser: AuthUser | null = null;

function readUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("folio.auth.user");
  // Only re-parse when the raw string actually changes
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = raw ? (JSON.parse(raw) as AuthUser) : null;
  }
  return cachedUser;
}

// ── useSyncExternalStore plumbing ──────────────────────────────────

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => { listeners.delete(listener); };
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === "folio.auth.user" || e.key === "folio.auth.token") {
      listener();
    }
  };
  const onAuthChange = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_EVENT, onAuthChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_EVENT, onAuthChange);
  };
}

function getSnapshot(): AuthUser | null {
  return readUser();
}

function getServerSnapshot(): AuthUser | null {
  return null;
}

/** Dispatch to all listeners that auth state changed */
export function notifyAuthChange() {
  // Invalidate cache so next getSnapshot picks up new data
  cachedRaw = null;
  cachedUser = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }
  listeners.forEach((l) => l());
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isMounted,

    async login(input: { email: string; password: string }) {
      const u = await authApi.login(input);
      notifyAuthChange();
      return u;
    },

    async register(input: { name: string; email: string; password: string }) {
      const u = await authApi.register(input);
      notifyAuthChange();
      return u;
    },

    async googleLogin(token: string) {
      const u = await authApi.google(token);
      notifyAuthChange();
      return u;
    },

    async logout() {
      await authApi.logout();
      notifyAuthChange();
    },

    /** Update cached user in localStorage (after profile edit) */
    updateUser(updated: AuthUser) {
      if (typeof window === "undefined") return;
      localStorage.setItem("folio.auth.user", JSON.stringify(updated));
      notifyAuthChange();
    },
  };
}
