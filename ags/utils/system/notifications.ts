// @ts-ignore
import Notifd from "gi://AstalNotifd"
import { createState } from "ags"

export interface StoredNotif {
  id: number
  appName: string
  appIcon: string
  summary: string
  body: string
  actions: { label: string, id: string }[]
  urgency: number
}

const [notificationHistory, setNotificationHistory] = createState<StoredNotif[]>([])
export const getNotificationHistory = () => notificationHistory

export const addToHistory = (n: Notifd.Notification) => {
  const stored: StoredNotif = {
    id: n.id,
    appName: n.appName ?? "",
    appIcon: n.appIcon ?? n.image ?? "dialog-information-symbolic",
    summary: n.summary ?? "",
    body: n.body ?? "",
    actions: (n.actions ?? []).map((a: any) => ({ label: a.label, id: a.id ?? a.action })),
    urgency: n.urgency,
  }
  setNotificationHistory(prev => {
    if (prev.find(p => p.id === stored.id)) return prev
    return [stored, ...prev]
  })
}

export const removeFromHistory = (id: number) => {
  setNotificationHistory(prev => prev.filter(n => n.id !== id))
}

export const clearHistory = () => setNotificationHistory([])

export function urgencyClass(urgency: number): string {
  switch (urgency) {
    case 0: return "low"
    case 2: return "critical"
    default: return "normal"
  }
}