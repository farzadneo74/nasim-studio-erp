"use client"

import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/lib/api/client"

/**
 * وضعیت super-admin کاربر فعلی
 * فرزاد (و هر کس دیگری که isSuperAdmin=true باشد) می‌تواند پنل super-admin را ببیند
 */
export function useIsSuperAdmin() {
  const api = useApi()
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const res = await api.get<{ isSuperAdmin?: boolean }>("/api/auth/me")
      return res.isSuperAdmin === true
    },
    staleTime: 5 * 60 * 1000, // 5 دقیقه
    retry: 1,
  })
}
