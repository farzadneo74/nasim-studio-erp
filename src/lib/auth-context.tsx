"use client"

import * as React from "react"

interface Studio {
  id: string
  name: string
  nameEn: string | null
  role: string
  isActive: boolean
}

const TOKEN_KEY = "nasim-session-token"

function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function setStoredToken(token: string | null) {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken()
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
}

interface AuthState {
  loading: boolean
  authed: boolean
  user: { id: string; phone: string; name: string } | null
  studios: Studio[]
  currentStudioId: string | null
  currentRole: string | null
  refresh: () => Promise<void>
  setAuthData: (data: {
    user: { id: string; phone: string; name: string } | null
    studios: Studio[]
    currentStudioId: string | null
    currentRole: string | null
  }) => void
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<Omit<AuthState, "refresh" | "setAuthData" | "logout">>({
    loading: true, authed: false, user: null, studios: [], currentStudioId: null, currentRole: null,
  })

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include", headers: authHeaders() })
      const data = await res.json()
      setState({ loading: false, authed: data.authed, user: data.user ?? null, studios: data.studios ?? [], currentStudioId: data.currentStudioId ?? null, currentRole: data.currentRole ?? null })
    } catch { setState((s) => ({ ...s, loading: false })) }
  }, [])

  const setAuthData = React.useCallback((data: { user: { id: string; phone: string; name: string } | null; studios: Studio[]; currentStudioId: string | null; currentRole: string | null }) => {
    setState({ loading: false, authed: true, user: data.user, studios: data.studios, currentStudioId: data.currentStudioId, currentRole: data.currentRole })
  }, [])

  const logout = React.useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include", headers: authHeaders() })
    setStoredToken(null)
    setState({ loading: false, authed: false, user: null, studios: [], currentStudioId: null, currentRole: null })
  }, [])

  React.useEffect(() => { refresh() }, [refresh])

  return <AuthContext.Provider value={{ ...state, refresh, setAuthData, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export { getStoredToken, setStoredToken, authHeaders }
