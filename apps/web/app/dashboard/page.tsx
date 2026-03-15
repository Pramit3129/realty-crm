"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import LeadsView from "@/components/dashboard/LeadsView";
import PipelineView from "@/components/dashboard/PipelineView";
import NotesView from "@/components/dashboard/NotesView";
import MembersView from "@/components/dashboard/MembersView";
import TasksView from "@/components/dashboard/TasksView";
import CampaignsView from "@/components/dashboard/CampaignsView";
import SettingsView from "@/components/dashboard/SettingsView";
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

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);

  const initialView = (searchParams.get("view") as ActiveViewType) || "leads";
  const [activeView, setActiveView] = useState<ActiveViewType>(initialView);

  const activeWorkspace = workspaces.find((w) => w._id === activeWorkspaceId);

  const refreshWorkspaces = useCallback(
    async (newWorkspaceId?: string) => {
      const token = getToken();
      if (!token) {
        router.replace("/");
        return;
      }

      async function doFetch(authToken: string) {
        return fetch(`${API_BASE_URL}/workspace`, {
          headers: { Authorization: `Bearer ${authToken}` },
          credentials: "include",
        });
      }

      try {
        let res = await doFetch(token);

        if (res.status === 401) {
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

        if (!Array.isArray(data) || data.length === 0) {
          // Authenticated but no workspace → go home for workspace step
          router.replace("/");
          return;
        }

        setWorkspaces(data);
        if (newWorkspaceId) {
          setActiveWorkspaceId(newWorkspaceId);
        } else if (
          !activeWorkspaceId ||
          !data.find((w: any) => w._id === activeWorkspaceId)
        ) {
          setActiveWorkspaceId(data[0]._id);
        }
      } catch {
        clearToken();
        router.replace("/");
      } finally {
        setLoading(false);
      }
    },
    [router, activeWorkspaceId],
  );

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

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
      {activeView !== "settings" && (
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onWorkspaceChange={setActiveWorkspaceId}
          refreshWorkspaces={refreshWorkspaces}
          activeView={activeView}
          onViewChange={setActiveView}
        />
      )}
      {activeView === "leads" ? (
        <LeadsView
          workspaceId={activeWorkspaceId}
          userRole={activeWorkspace?.role || "AGENT"}
        />
      ) : activeView === "campaigns" ? (
        <CampaignsView
          workspaceId={activeWorkspaceId}
          userRole={activeWorkspace?.role || "AGENT"}
        />
      ) : activeView === "pipeline" ? (
        <PipelineView
          workspaceId={activeWorkspaceId}
          userRole={activeWorkspace?.role || "AGENT"}
        />
      ) : activeView === "notes" ? (
        <NotesView
          workspaceId={activeWorkspaceId}
          userRole={activeWorkspace?.role || "AGENT"}
        />
      ) : activeView === "members" ? (
        <MembersView
          workspaceId={activeWorkspaceId}
          userRole={activeWorkspace?.role || "AGENT"}
        />
      ) : activeView.startsWith("tasks-") ? (
        <TasksView
          workspaceId={activeWorkspaceId}
          subView={activeView as "tasks-all" | "tasks-status" | "tasks-me"}
          userRole={activeWorkspace?.role || "AGENT"}
        />
      ) : activeView === "settings" ? (
        <SettingsView workspace={activeWorkspace} onClose={() => setActiveView("leads")} />
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <p className="animate-pulse text-sm text-muted-foreground">
            Loading dashboard…
          </p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
