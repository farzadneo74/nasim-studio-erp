"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Clock } from "lucide-react"

import {
  startReminderNotifier,
  stopAlarm,
  type DueReminder,
} from "@/lib/reminders/reminder-notifications"
import { formatDateTime } from "@/lib/format"

/**
 * Invisible background component that:
 *  - Starts the reminder notification poller on mount.
 *  - When a reminder fires, shows a sonner toast AND triggers the overdue
 *    blocking modal to re-check (by invalidating the `["reminders","overdue"]`
 *    query — which OverdueRemindersModal subscribes to).
 *
 * Renders nothing.
 */
export function ReminderNotifier() {
  const qc = useQueryClient()

  React.useEffect(() => {
    const stop = startReminderNotifier((r: DueReminder) => {
      // Show an in-page toast so the user notices even if browser
      // notifications are blocked.
      toast(
        <>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="font-semibold">{r.title}</span>
          </div>
          {r.note && (
            <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            سررسید: {formatDateTime(r.dueAt)}
          </p>
        </>,
        {
          duration: 10000,
          onDismiss: () => {
            // Stop the alarm when the user dismisses the toast.
            stopAlarm()
          },
          onAutoClose: () => {
            stopAlarm()
          },
        }
      )

      // Force the overdue blocking modal to re-fetch — if the reminder is now
      // overdue it will appear in the modal.
      qc.invalidateQueries({ queryKey: ["reminders", "overdue"] })
      qc.invalidateQueries({ queryKey: ["reminders"] })
    })

    return () => {
      stop()
    }
  }, [qc])

  return null
}

