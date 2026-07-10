"use client"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { LoginView, StudioPickerView } from "@/components/views/login-view"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { OverdueRemindersModal } from "@/components/workspace/overdue-reminders-modal"
import { ReminderNotifier } from "@/components/workspace/reminder-notifier"
import { Skeleton } from "@/components/ui/skeleton"

function AuthGate() {
  const { loading, authed, user, currentStudioId } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (!authed || !user) return <LoginView />
  if (!currentStudioId) return <StudioPickerView />
  return (
    <>
      <WorkspaceShell />
      {/* Overlay the overdue blocking modal on top of the workspace shell so
          it intercepts all interaction when there are overdue reminders. */}
      <OverdueRemindersModal />
      {/* Background poller: fires browser notifications + alarm when reminders
          become due, and re-checks the overdue blocking modal. */}
      <ReminderNotifier />
    </>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
