import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api/portal"

export function usePortalProfile(customerId: string | undefined) {
  return useQuery({
    queryKey: ["portalProfile", customerId],
    queryFn: () => api.getPortalProfile(customerId as string),
    enabled: !!customerId,
  })
}
