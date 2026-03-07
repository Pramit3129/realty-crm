"use client";

import { useState } from "react";
import { Users, ChevronDown, LogOut, Sun, Moon, Kanban, StickyNote, CheckSquare, ListTodo, Columns3, UserSquare2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearToken } from "@/lib/auth";
import { useTheme } from "@/components/providers/ThemeProvider";

// ── Types ─────────────────────────────────────────────────────────────
export type ActiveViewType = 
  | "leads" 
  | "pipeline" 
  | "notes" 
  | "tasks-all" 
  | "tasks-status" 
  | "tasks-me";

// ── Props ─────────────────────────────────────────────────────────────
interface SidebarProps {
  workspaceName: string;
  activeView: ActiveViewType;
  onViewChange: (view: ActiveViewType) => void;
}

// ── Nav items config ──────────────────────────────────────────────────
type NavItem = {
  key: ActiveViewType | "tasks";
  label: string;
  icon: any;
  subItems?: { key: ActiveViewType; label: string; icon: any }[];
};

const NAV_ITEMS: NavItem[] = [
  { key: "leads", label: "Leads", icon: Users },
  { key: "pipeline", label: "Pipeline", icon: Kanban },
  { key: "notes", label: "Notes", icon: StickyNote },
  { 
    key: "tasks", 
    label: "Tasks", 
    icon: CheckSquare,
    subItems: [
      { key: "tasks-all", label: "All Tasks", icon: ListTodo },
      { key: "tasks-status", label: "By Status", icon: Columns3 },
      { key: "tasks-me", label: "Assigned to Me", icon: UserSquare2 },
    ]
  },
];

// ── Sidebar Component ─────────────────────────────────────────────────

export default function Sidebar({
  workspaceName,
  activeView,
  onViewChange,
}: SidebarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [tasksExpanded, setTasksExpanded] = useState(true);

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* ── Workspace header + dropdown ─────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]">
            {/* Workspace initial */}
            <span className="flex h-6 w-6 items-center justify-center rounded bg-violet-600 text-[11px] font-bold text-white">
              {workspaceName.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 truncate text-sm font-medium">
              {workspaceName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Section label ─────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
          Workspace
        </p>
      </div>

      {/* ── Nav items ─────────────────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          if (item.subItems) {
            const isActiveParent = activeView.startsWith("tasks-");
            return (
              <div key={item.key} className="flex flex-col gap-0.5">
                <button
                  onClick={() => setTasksExpanded(!tasksExpanded)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    isActiveParent
                      ? "bg-white/[0.06] text-sidebar-foreground"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-sidebar-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${tasksExpanded ? "" : "-rotate-90"}`} />
                </button>
                {tasksExpanded && (
                  <div className="mt-0.5 flex flex-col gap-0.5 pl-6">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.key}
                        onClick={() => onViewChange(subItem.key as ActiveViewType)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          activeView === subItem.key
                            ? "bg-white/[0.06] text-sidebar-foreground"
                            : "text-muted-foreground hover:bg-white/[0.04] hover:text-sidebar-foreground"
                        }`}
                      >
                        <subItem.icon className="h-4 w-4 opacity-70" />
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.key}
              onClick={() => onViewChange(item.key as ActiveViewType)}
              className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                activeView === item.key
                  ? "bg-white/[0.06] text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />
    </aside>
  );
}
