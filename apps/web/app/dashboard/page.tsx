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
import InboxView from "@/components/dashboard/InboxView";
import TrackerView from "@/components/dashboard/TrackerView";
import AnalyticsView from "@/components/dashboard/AnalyticsView";
import type { ActiveViewType } from "@/components/dashboard/Sidebar";
import {
  clearToken,
  API_BASE_URL,
} from "@/lib/auth";
import { api } from "@/lib/api";
import { Menu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeWorkspace = workspaces.find((w) => w._id === activeWorkspaceId);

  const refreshWorkspaces = useCallback(
    async (newWorkspaceId?: string) => {
      try {
        const res = await api("/workspace");

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
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground/60 font-medium">
          Loading workspace…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile Header with Hamburger */}
      <div className="fixed top-0 left-0 z-30 flex h-12 w-full items-center border-b border-white/[0.06] bg-background px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex h-full w-full pt-12 lg:pt-0">
        {activeView !== "settings" && (
          <Sidebar
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onWorkspaceChange={setActiveWorkspaceId}
            refreshWorkspaces={refreshWorkspaces}
            activeView={activeView}
            onViewChange={setActiveView}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="flex-1 flex flex-col min-w-0">
      {activeView === "leads" ? (
        <LeadsView
          workspaceId={activeWorkspaceId}
          userRole={activeWorkspace?.role || "AGENT"}
        />
      ) : activeView === "inbox" ? (
        <InboxView />
      ) : activeView === "campaigns" ? (
        <CampaignsView
          workspaceId={activeWorkspaceId}
          userRole={activeWorkspace?.role || "AGENT"}
          onCloseSidebar={() => setIsSidebarOpen(false)}
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
        <SettingsView workspace={activeWorkspace} onClose={() => setActiveView("leads")} onUpdate={refreshWorkspaces} />
      ) : activeView === "tracker" ? (
        <TrackerView workspaceId={activeWorkspaceId} userRole={activeWorkspace?.role || "AGENT"} />
      ) : activeView === "analytics" ? (
        <AnalyticsView workspaceId={activeWorkspaceId} />
      ) : null}
      </div>
    </div>
  </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen flex-col items-center justify-center bg-background gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground/60 font-medium">
            Loading dashboard…
          </p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
