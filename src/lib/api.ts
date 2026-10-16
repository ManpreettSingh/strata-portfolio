const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const TOKEN_KEY = "folio.auth.token";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type VerificationStarted = {
  verificationRequired: true;
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  // The nav shows/hides "Sign in" via this html class (set once at page load in __root.tsx),
  // so it must follow the token, otherwise a cleared session leaves no sign-in button at all.
  document.documentElement.classList.toggle("is-authenticated", Boolean(token));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  // Step 1: the server emails a 6-digit code. No account or session exists yet.
  async register(input: { name: string; email: string; password: string }) {
    return request<VerificationStarted>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  // Step 2: submitting the right code creates the account and signs the user in.
  async verifyRegistration(input: { email: string; code: string }) {
    const result = await request<{ user: AuthUser; token: string }>("/auth/register/verify", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setAuthToken(result.token);
    localStorage.setItem("folio.auth.user", JSON.stringify(result.user));
    return result.user;
  },
  async resendRegistrationCode(email: string) {
    return request<VerificationStarted>("/auth/register/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  async login(input: { email: string; password: string }) {
    const result = await request<{ user: AuthUser; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setAuthToken(result.token);
    localStorage.setItem("folio.auth.user", JSON.stringify(result.user));
    return result.user;
  },
  async logout() {
    if (getAuthToken()) await request<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
    setAuthToken(null);
    localStorage.removeItem("folio.auth.user");
  },
  async google(token: string) {
    const result = await request<{ user: AuthUser; token: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    setAuthToken(result.token);
    localStorage.setItem("folio.auth.user", JSON.stringify(result.user));
    return result.user;
  },
  async updateProfile(input: { name?: string; email?: string }) {
    const result = await request<{ user: AuthUser }>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    // Update cached user
    localStorage.setItem("folio.auth.user", JSON.stringify(result.user));
    return result.user;
  },
  currentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("folio.auth.user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
};
