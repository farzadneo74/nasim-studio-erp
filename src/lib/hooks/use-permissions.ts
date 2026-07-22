"use client"

import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/lib/api/client"

export interface MyPermissions {
  role: string
  effective: Record<string, boolean>
  userOverrides: Record<string, boolean>
}

/**
 * Fetches the CURRENT user's effective permission map from
 * /api/permissions/me. Cached for 1 minute (staleTime) to avoid
 * hammering the endpoint on every page navigation.
 *
 * Returns { data, isLoading, isError } shape from react-query.
 * If the request fails (e.g. unauthenticated), `data` will be null.
 */
export function usePermissions() {
  const api = useApi()
  return useQuery<MyPermissions | null>({
    queryKey: ["permissions", "me"],
    queryFn: async () => {
      try {
        return await api.get<MyPermissions>("/api/permissions/me")
      } catch {
        return null
      }
    },
    staleTime: 60_000, // 1 min
  })
}

/**
 * Convenience hook: returns true if the current user has the given
 * permission (resolved via per-user overrides + studio role overrides +
 * role defaults on the server). Returns false if permissions haven't
 * loaded yet or the user lacks the permission.
 */
export function useHasPermission(perm: string): boolean {
  const { data } = usePermissions()
  return data?.effective?.[perm] === true
}
