"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import LeadsView from "@/components/dashboard/LeadsView";
import PipelineView from "@/components/dashboard/PipelineView";
import NotesView from "@/components/dashboard/NotesView";
import TasksView from "@/components/dashboard/TasksView";
import type { ActiveViewType } from "@/components/dashboard/Sidebar";
import {
  getToken,
  clearToken,
  tryRefreshToken,
  API_BASE_URL,
} from "@/lib/auth";

// ── Dashboard Page ────────────────────────────────────────────────────
// Protected page:
//   No token           → redirect to "/" (login)
//   Token but no wksp  → redirect to "/" (workspace creation)
//   Token + workspace  → show dashboard

export default function DashboardPage() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveViewType>("leads");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/");
      return;
    }

    async function doFetch(authToken: string): Promise<Response> {
      return fetch(`${API_BASE_URL}/workspace`, {
        headers: { Authorization: `Bearer ${authToken}` },
        credentials: "include",
      });
    }

    async function fetchWorkspace() {
      try {
        let res = await doFetch(token!);

        if (res.status === 401) {
          // Token expired — try to refresh
          const refreshed = await tryRefreshToken();
          if (refreshed) {
            res = await doFetch(getToken()!);
          } else {
            clearToken();
            router.replace("/");
            return;
          }
        }

        if (!res.ok) {
          clearToken();
          router.replace("/");
          return;
        }

        const data = await res.json();

        if (!data || !data.name) {
          // Authenticated but no workspace → go home for workspace step
          router.replace("/");
          return;
        }

        setWorkspaceName(data.name);
        setWorkspaceId(data._id);
      } catch {
        clearToken();
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkspace();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="animate-pulse text-sm text-muted-foreground">
          Loading workspace…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar
        workspaceName={workspaceName}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      {activeView === "leads" ? (
        <LeadsView workspaceId={workspaceId} />
      ) : activeView === "pipeline" ? (
        <PipelineView workspaceId={workspaceId} />
      ) : activeView === "notes" ? (
        <NotesView workspaceId={workspaceId} />
      ) : activeView.startsWith("tasks-") ? (
        <TasksView workspaceId={workspaceId} subView={activeView as "tasks-all" | "tasks-status" | "tasks-me"} />
      ) : null}
    </div>
  );
}
