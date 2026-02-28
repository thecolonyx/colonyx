import { queryClient } from "./queryClient";

export function getToken(): string | null {
  return localStorage.getItem("colonyx_token");
}

export function setToken(token: string) {
  localStorage.setItem("colonyx_token", token);
}

export function clearToken() {
  localStorage.removeItem("colonyx_token");
  queryClient.clear();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (data) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || res.statusText);
  }
  return res;
}

export function downloadCredentials(username: string, password: string) {
  const date = new Date().toLocaleString();
  const content = `=== colonyx Account Credentials ===
Date: ${date}
Username: ${username}
Password: ${password}

KEEP THIS FILE SAFE.
If you lose your password, you cannot recover your account.
There is no password recovery - save this file!`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `colonyx-credentials-${username}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
