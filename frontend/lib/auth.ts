/**
 * Auth API helpers — wraps /api/auth/* endpoints.
 * Cookies are set/cleared by the backend (HttpOnly), so we just need
 * to include credentials on every fetch.
 */

import { BACKEND_BASE } from "./api";
import type { UserOut } from "./types";

async function authFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const token = typeof window !== "undefined" ? localStorage.getItem("convox_token") : null;
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_BASE}${path}`, {
    credentials: "include",          // include HttpOnly cookie
    ...init,
    headers: isForm
      ? { ...authHeaders, ...init?.headers }
      : { "Content-Type": "application/json", ...authHeaders, ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      detail?: string | { message?: string };
    };
    const raw = body?.detail;
    const message =
      (typeof raw === "string" ? raw : raw?.message) ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function register(
  displayName: string,
  email: string,
  password: string,
): Promise<UserOut> {
  const user = await authFetch<UserOut>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      display_name: displayName,
      email,
      password,
    }),
  });
  if (user.token && typeof window !== "undefined") {
    localStorage.setItem("convox_token", user.token);
    document.cookie = `convox_session=${user.token}; path=/; max-age=604800; SameSite=Lax`;
  }
  return user;
}

export async function login(
  email: string,
  password: string,
): Promise<UserOut> {
  const user = await authFetch<UserOut>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (user.token && typeof window !== "undefined") {
    localStorage.setItem("convox_token", user.token);
    document.cookie = `convox_session=${user.token}; path=/; max-age=604800; SameSite=Lax`;
  }
  return user;
}

export async function logout(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("convox_token");
    document.cookie = "convox_session=; path=/; max-age=0;";
  }
  await authFetch<{ status: string }>("/api/auth/logout", {
    method: "POST",
  }).catch(() => {});
}

export async function getMe(): Promise<UserOut | null> {
  try {
    return await authFetch<UserOut>("/api/auth/me");
  } catch {
    return null;
  }
}

export async function saveOnboarding(
  country: string,
  communicationContext: string,
): Promise<UserOut> {
  return authFetch<UserOut>("/api/auth/onboarding", {
    method: "POST",
    body: JSON.stringify({
      country,
      communication_context: communicationContext,
    }),
  });
}
