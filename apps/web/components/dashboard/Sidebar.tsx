"use client";

import { Users, ChevronDown, LogOut, Sun, Moon, Kanban, StickyNote } from "lucide-react";
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

// ── Props ─────────────────────────────────────────────────────────────
interface SidebarProps {
  workspaceName: string;
  activeView: "leads" | "pipeline" | "notes";
  onViewChange: (view: "leads" | "pipeline" | "notes") => void;
}

// ── Nav items config ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "leads" as const, label: "Leads", icon: Users },
  { key: "pipeline" as const, label: "Pipeline", icon: Kanban },
  { key: "notes" as const, label: "Notes", icon: StickyNote },
] as const;

// ── Sidebar Component ─────────────────────────────────────────────────

export default function Sidebar({
  workspaceName,
  activeView,
  onViewChange,
}: SidebarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

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
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onViewChange(item.key)}
            className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              activeView === item.key
                ? "bg-white/[0.06] text-sidebar-foreground"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-sidebar-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1" />
    </aside>
  );
}
