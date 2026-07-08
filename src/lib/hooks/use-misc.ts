import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api/misc"
import type { CompanySettings, User } from "@/lib/types"
import { toast } from "sonner"

export const usersKey = ["users"] as const
export const notificationsKey = ["notifications"] as const
export const activityLogsKey = ["activityLogs"] as const
export const settingsKey = ["settings"] as const

export function useUsers() {
  return useQuery({ queryKey: usersKey, queryFn: api.listUsers })
}

export function useCreateUser(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<User, "id" | "createdAt">) => api.createUser(input, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKey })
      qc.invalidateQueries({ queryKey: activityLogsKey })
      toast.success("User created successfully")
    },
    onError: () => toast.error("Failed to create user"),
  })
}

export function useUpdateUser(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<User, "id" | "createdAt">> }) =>
      api.updateUser(id, input, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKey })
      qc.invalidateQueries({ queryKey: activityLogsKey })
      toast.success("User updated successfully")
    },
    onError: () => toast.error("Failed to update user"),
  })
}

export function useDeleteUser(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKey })
      qc.invalidateQueries({ queryKey: activityLogsKey })
      toast.success("User deleted")
    },
    onError: () => toast.error("Failed to delete user"),
  })
}

export function useNotifications() {
  return useQuery({ queryKey: notificationsKey, queryFn: api.listNotifications, refetchInterval: 30000 })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationsKey }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationsKey }),
  })
}

export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: api.getSettings })
}

export function useUpdateSettings(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<CompanySettings>) => api.updateSettings(input, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKey })
      qc.invalidateQueries({ queryKey: activityLogsKey })
      toast.success("Settings saved")
    },
    onError: () => toast.error("Failed to save settings"),
  })
}
