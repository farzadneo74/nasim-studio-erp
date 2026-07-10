"use client"

import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/lib/api/client"

const DEFAULT_FA = "عکاسی نسیم"
const DEFAULT_EN = "NASIM STUDIO"

export function useStudioName() {
  const api = useApi()
  const { data } = useQuery({
    queryKey: ["studio-name"],
    queryFn: () => api.get<{ fa: string; en: string }>("/api/studio-name").catch(() => ({ fa: DEFAULT_FA, en: DEFAULT_EN })),
    staleTime: 60_000,
  })
  return { fa: data?.fa ?? DEFAULT_FA, en: data?.en ?? DEFAULT_EN }
}
