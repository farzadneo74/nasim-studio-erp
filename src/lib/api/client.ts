"use client"

import { useWorkspace } from "@/stores/workspace"

const TOKEN_KEY = "nasim-session-token"

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  let token: string | null = null
  try { token = localStorage.getItem(TOKEN_KEY) } catch { /* ignore */ }
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

/**
 * Thin fetch wrapper that injects the active demo role into the x-demo-role header
 * so server-side RBAC reflects the user's current role switch.
 * Also includes credentials (cookies) and the Bearer token from localStorage.
 */
export function useApi() {
  const role = useWorkspace((s) => s.role)
  return {
    get: async <T = unknown>(url: string): Promise<T> => {
      const res = await fetch(url, {
        headers: authHeaders({ "x-demo-role": role }),
        credentials: "include",
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      return res.json()
    },
    post: async <T = unknown>(url: string, body?: unknown): Promise<T> => {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json", "x-demo-role": role }),
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      return res.json()
    },
    patch: async <T = unknown>(url: string, body?: unknown): Promise<T> => {
      const res = await fetch(url, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json", "x-demo-role": role }),
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      return res.json()
    },
    put: async <T = unknown>(url: string, body?: unknown): Promise<T> => {
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json", "x-demo-role": role }),
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      return res.json()
    },
    del: async <T = unknown>(url: string): Promise<T> => {
      const res = await fetch(url, {
        method: "DELETE",
        headers: authHeaders({ "x-demo-role": role }),
        credentials: "include",
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      return res.json()
    },
  }
}

