"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type DragEvent,
} from "react";
import {
  Plus,
  X,
  Mail,
  Phone,
  Globe,
  Clock,
  ChevronDown,
  Filter,
  Check,
  ArrowUpDown,
  Search,
  GripVertical,
  MoreHorizontal,
  User,
  Kanban,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, getToken } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────
interface Pipeline {
  _id: string;
  name: string;
  type: "BUYER" | "SELLER";
}

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  city?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface KanbanStage {
  _id: string;
  name: string;
  description: string;
  stageNumber: number;
  probability: number;
  isFinal: boolean;
  colorIndex?: number;
  leads: Lead[];
}

interface PipelineViewProps {
  workspaceId: string;
}

// ── Stage color palette — each stage gets a unique color ──────────────
const STAGE_COLORS = [
  { bg: "rgba(59,130,246,0.18)", text: "#60a5fa", border: "#3b82f6" }, // blue
  { bg: "rgba(245,158,11,0.18)", text: "#fbbf24", border: "#f59e0b" }, // amber
  { bg: "rgba(16,185,129,0.18)", text: "#34d399", border: "#10b981" }, // emerald
  { bg: "rgba(139,92,246,0.18)", text: "#a78bfa", border: "#8b5cf6" }, // violet
  { bg: "rgba(236,72,153,0.18)", text: "#f472b6", border: "#ec4899" }, // pink
  { bg: "rgba(6,182,212,0.18)", text: "#22d3ee", border: "#06b6d4" }, // cyan
  { bg: "rgba(249,115,22,0.18)", text: "#fb923c", border: "#f97316" }, // orange
  { bg: "rgba(168,85,247,0.18)", text: "#c084fc", border: "#a855f7" }, // purple
  { bg: "rgba(34,197,94,0.18)", text: "#4ade80", border: "#22c55e" }, // green
  { bg: "rgba(239,68,68,0.18)", text: "#f87171", border: "#ef4444" }, // red
  { bg: "rgba(20,184,166,0.18)", text: "#2dd4bf", border: "#14b8a6" }, // teal
  { bg: "rgba(99,102,241,0.18)", text: "#818cf8", border: "#6366f1" }, // indigo
  { bg: "rgba(132,204,22,0.18)", text: "#a3e635", border: "#84cc16" }, // lime
  { bg: "rgba(244,63,94,0.18)", text: "#fb7185", border: "#f43f5e" }, // rose
  { bg: "rgba(14,165,233,0.18)", text: "#38bdf8", border: "#0ea5e9" }, // sky
  { bg: "rgba(217,70,239,0.18)", text: "#e879f9", border: "#d946ef" }, // fuchsia
  { bg: "rgba(234,179,8,0.18)", text: "#fde047", border: "#eab708" }, // yellow
  { bg: "rgba(100,116,139,0.18)", text: "#94a3b8", border: "#64748b" }, // slate
  { bg: "rgba(120,113,108,0.18)", text: "#a8a29e", border: "#78716c" }, // stone
  { bg: "rgba(63,63,70,0.18)", text: "#a1a1aa", border: "#3f3f46" }, // zinc
];

// ── Source icon colors ────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  manual: "#8b5cf6",
  website: "#3b82f6",
  referral: "#10b981",
  zillow: "#ef4444",
  realtor: "#f59e0b",
  social: "#ec4899",
};

// ── Helpers ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ══════════════════════════════════════════════════════════════════════
// PipelineView (main export)
// ══════════════════════════════════════════════════════════════════════
export default function PipelineView({ workspaceId }: PipelineViewProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedStage, setSelectedStage] = useState<KanbanStage | null>(null);
  const [pipelineDropdownOpen, setPipelineDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "source">("date");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("");

  // Create pipeline modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create lead modal
  const [createLeadStageId, setCreateLeadStageId] = useState<string | null>(null);

  // Drag state
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const token = getToken();
  const pipelineDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // ── Close dropdowns on outside click ────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        pipelineDropdownRef.current &&
        !pipelineDropdownRef.current.contains(e.target as Node)
      )
        setPipelineDropdownOpen(false);
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target as Node)
      )
        setSortDropdownOpen(false);
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target as Node)
      )
        setFilterDropdownOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch pipelines ─────────────────────────────────────────────────
  const fetchPipelines = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/pipeline/workspace/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data: Pipeline[] = await res.json();
        setPipelines(data);
        if (data.length > 0 && !activePipeline) {
          setActivePipeline(data[0]);
        }
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [workspaceId, token, activePipeline]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  // ── Fetch kanban board ──────────────────────────────────────────────
  const fetchKanbanBoard = useCallback(async () => {
    if (!activePipeline) return;
    setBoardLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/pipeline-stage/kanban/${activePipeline._id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data: KanbanStage[] = await res.json();
        setStages(data);
      }
    } catch {
      /* silent */
    } finally {
      setBoardLoading(false);
    }
  }, [activePipeline, token]);

  useEffect(() => {
    fetchKanbanBoard();
  }, [fetchKanbanBoard]);

  // ── Delete Pipeline ─────────────────────────────────────────────────
  async function handleDeletePipeline(pipelineId: string) {
    if (!window.confirm("Are you sure you want to delete this pipeline?")) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/pipeline/details/${pipelineId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (activePipeline?._id === pipelineId) {
          setActivePipeline(null);
        }
        fetchPipelines();
      } else {
        const body = await res.json();
        alert(body.message || "Failed to delete pipeline.");
      }
    } catch {
      alert("Failed to delete pipeline.");
    }
  }

  // Keep selected lead in sync
  useEffect(() => {
    if (selectedLead) {
      for (const stage of stages) {
        const found = stage.leads.find((l) => l._id === selectedLead._id);
        if (found) {
          setSelectedLead(found);
          setSelectedStage(stage);
          return;
        }
      }
    }
  }, [stages]);

  // ── Move lead (drag & drop) ─────────────────────────────────────────
  async function moveLead(leadId: string, targetStageId: string) {
    // Optimistic update
    setStages((prev) => {
      const next = prev.map((s) => ({ ...s, leads: [...s.leads] }));
      let movedLead: Lead | undefined;
      for (const stage of next) {
        const idx = stage.leads.findIndex((l) => l._id === leadId);
        if (idx !== -1) {
          movedLead = stage.leads.splice(idx, 1)[0];
          break;
        }
      }
      if (movedLead) {
        const target = next.find((s) => s._id === targetStageId);
        if (target) target.leads.push(movedLead);
      }
      return next;
    });

    try {
      await fetch(`${API_BASE_URL}/pipeline-stage/move-lead`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, targetStageId }),
      });
      // Refresh to get accurate data
      fetchKanbanBoard();
    } catch {
      // Rollback on error
      fetchKanbanBoard();
    }
  }

  // ── DnD handlers ────────────────────────────────────────────────────
  function handleDragStart(e: DragEvent, lead: Lead) {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lead._id);
    // Add a slight delay so the dragged element is visible
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  }

  function handleDragEnd(e: DragEvent) {
    setDraggedLead(null);
    setDragOverStageId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }

  function handleDragOver(e: DragEvent, stageId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStageId(stageId);
  }

  function handleDragLeave(e: DragEvent) {
    // Only clear if leaving the column (not entering a child)
    const relatedTarget = e.relatedTarget as Node | null;
    if (
      e.currentTarget instanceof HTMLElement &&
      !e.currentTarget.contains(relatedTarget)
    ) {
      setDragOverStageId(null);
    }
  }

  function handleDrop(e: DragEvent, targetStageId: string) {
    e.preventDefault();
    setDragOverStageId(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId && draggedLead) {
      // Don't move if already in this stage
      const sourceStage = stages.find((s) =>
        s.leads.some((l) => l._id === leadId),
      );
      if (sourceStage && sourceStage._id !== targetStageId) {
        moveLead(leadId, targetStageId);
      }
    }
    setDraggedLead(null);
  }

  // ── Filter & sort leads ─────────────────────────────────────────────
  function getFilteredLeads(leads: Lead[]): Lead[] {
    let filtered = [...leads];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.includes(q),
      );
    }

    if (filterSource) {
      filtered = filtered.filter(
        (l) => l.source.toLowerCase() === filterSource.toLowerCase(),
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "source":
          return a.source.localeCompare(b.source);
        case "date":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return filtered;
  }

  // ── Get all unique sources ──────────────────────────────────────────
  const allSources = Array.from(
    new Set(stages.flatMap((s) => s.leads.map((l) => l.source.toLowerCase()))),
  );

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="animate-pulse text-sm text-muted-foreground">
          Loading pipelines…
        </p>
      </div>
    );
  }

  const totalLeads = stages.reduce((sum, s) => sum + s.leads.length, 0);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Main board area ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-background min-w-0">
        {/* ── Top header bar ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-2">
            <Kanban className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold text-foreground">Pipeline</h1>
          </div>
        </div>

        {/* ── Sub-header: pipeline selector + toolbar ───────────────── */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-1.5">
          <div className="flex items-center gap-3">
            {/* Pipeline selector */}
            <div ref={pipelineDropdownRef} className="relative">
              <button
                onClick={() => setPipelineDropdownOpen(!pipelineDropdownOpen)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.04]"
              >
                <Kanban className="h-3 w-3 text-muted-foreground" />
                {activePipeline?.name || "Select Pipeline"}
                <span className="ml-1 text-muted-foreground/60">
                  {totalLeads}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {pipelineDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
                  {pipelines.map((p) => (
                    <div key={p._id} className="group relative flex w-full items-center">
                      <button
                        onClick={() => {
                          setActivePipeline(p);
                          setPipelineDropdownOpen(false);
                        }}
                        className={`flex flex-1 items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-white/[0.06] pr-8 ${
                          activePipeline?._id === p._id
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            p.type === "BUYER" ? "bg-blue-500" : "bg-emerald-500"
                          }`}
                        />
                        <span className="truncate">{p.name}</span>
                        <span className="ml-auto text-[10px] uppercase text-muted-foreground/50">
                          {p.type}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePipeline(p._id);
                          setPipelineDropdownOpen(false);
                        }}
                        className="absolute right-2 hidden p-1 text-muted-foreground hover:text-red-400 group-hover:block"
                        title="Delete Pipeline"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Divider */}
                  <div className="my-1 border-t border-white/[0.06]" />

                  {/* Create new */}
                  <button
                    onClick={() => {
                      setPipelineDropdownOpen(false);
                      setShowCreateModal(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    New Pipeline
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Toolbar: Search, Filter, Sort */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-40 rounded-md border-0 bg-white/[0.04] pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-white/10"
              />
            </div>

            {/* Filter */}
            <div ref={filterDropdownRef} className="relative">
              <button
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition-colors ${
                  filterSource
                    ? "bg-violet-500/15 text-violet-400"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                }`}
              >
                <Filter className="h-3 w-3" />
                Filter
              </button>
              {filterDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
                  <button
                    onClick={() => {
                      setFilterSource("");
                      setFilterDropdownOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-1.5 text-[11px] transition-colors hover:bg-white/[0.06] ${
                      !filterSource
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    All Sources
                  </button>
                  {allSources.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setFilterSource(s);
                        setFilterDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-[11px] capitalize transition-colors hover:bg-white/[0.06] ${
                        filterSource === s
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: SOURCE_COLORS[s] || "#666",
                        }}
                      />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <div ref={sortDropdownRef} className="relative">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                <ArrowUpDown className="h-3 w-3" />
                Sort
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
                  {(
                    [
                      { key: "date", label: "Date" },
                      { key: "name", label: "Name" },
                      { key: "source", label: "Source" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setSortBy(s.key);
                        setSortDropdownOpen(false);
                      }}
                      className={`flex w-full items-center px-3 py-1.5 text-[11px] transition-colors hover:bg-white/[0.06] ${
                        sortBy === s.key
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Kanban board ──────────────────────────────────────────── */}
        {boardLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="animate-pulse text-sm text-muted-foreground">
              Loading board…
            </p>
          </div>
        ) : stages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <Kanban className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No pipeline stages found
            </p>
            <p className="text-xs text-muted-foreground/60">
              Create a lead to auto-generate your pipeline
            </p>
          </div>
        ) : (
          <div className="flex flex-1 gap-0 overflow-x-auto overflow-y-hidden px-0 py-0 pb-2">
            {stages.map((stage, idx) => {
              const color = STAGE_COLORS[stage.colorIndex ?? (idx % STAGE_COLORS.length)];
              const filteredLeads = getFilteredLeads(stage.leads);
              const isDragOver = dragOverStageId === stage._id;

              return (
                <div
                  key={stage._id}
                  className={`flex h-full w-[280px] min-w-[280px] shrink-0 flex-col border-r border-white/[0.04] transition-colors ${
                    isDragOver ? "bg-white/[0.02]" : ""
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage._id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage._id)}
                >
                  {/* ── Column header ────────────────────────────────── */}
                  <div className="flex items-center gap-2 px-3 py-3">
                    <span
                      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                      }}
                    >
                      {stage.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground/50">
                      {filteredLeads.length}
                    </span>
                  </div>

                  {/* ── Cards area ──────────────────────────────────── */}
                  <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
                    {filteredLeads.map((lead) => (
                      <LeadCard
                        key={lead._id}
                        lead={lead}
                        stageColor={color}
                        isSelected={selectedLead?._id === lead._id}
                        onSelect={() => {
                          setSelectedLead(
                            selectedLead?._id === lead._id ? null : lead,
                          );
                          setSelectedStage(stage);
                        }}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}

                    {/* ── "+ New" button ────────────────────────────── */}
                    <button
                      onClick={() => setCreateLeadStageId(stage._id)}
                      className="flex items-center gap-1.5 rounded-md px-2 py-2 text-[12px] text-muted-foreground/40 transition-colors hover:bg-white/[0.03] hover:text-muted-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      New
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create pipeline modal ──────────────────────────────────── */}
      {showCreateModal && (
        <CreatePipelineModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newPipeline) => {
            setPipelines((prev) => [...prev, newPipeline]);
            setActivePipeline(newPipeline);
            setShowCreateModal(false);
            fetchKanbanBoard();
          }}
        />
      )}

      {/* ── Detail panel (right side) ─────────────────────────────────── */}
      {selectedLead && selectedStage && (
        <LeadDetailPanel
          lead={selectedLead}
          stage={selectedStage}
          onClose={() => {
            setSelectedLead(null);
            setSelectedStage(null);
          }}
          onUpdate={() => fetchKanbanBoard()}
        />
      )}

      {/* ── Create Lead Modal ─────────────────────────────────────── */}
      {createLeadStageId && activePipeline && (
        <CreateLeadModal
          workspaceId={workspaceId}
          pipelineId={activePipeline._id}
          stageId={createLeadStageId}
          onClose={() => setCreateLeadStageId(null)}
          onCreated={() => {
            fetchKanbanBoard();
            setCreateLeadStageId(null);
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════

// ── Lead Card ─────────────────────────────────────────────────────────
function LeadCard({
  lead,
  stageColor,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  stageColor: { bg: string; text: string; border: string };
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: DragEvent, lead: Lead) => void;
  onDragEnd: (e: DragEvent) => void;
}) {
  const sourceColor = SOURCE_COLORS[lead.source.toLowerCase()] || "#666";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`group cursor-pointer rounded-lg border transition-all duration-150 ${
        isSelected
          ? "border-white/[0.15] bg-white/[0.06]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] hover:bg-white/[0.04]"
      }`}
    >
      <div className="px-3 py-2.5">
        {/* Lead name with avatar */}
        <div className="mb-2 flex items-center gap-2">
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
            style={{ backgroundColor: stageColor.border }}
          >
            {lead.name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-[13px] font-medium text-foreground">
            {lead.name}
          </span>
        </div>

        {/* Lead details */}
        <div className="flex flex-col gap-1.5">
          {lead.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span className="truncate text-[11px] text-muted-foreground">
                {lead.email}
              </span>
            </div>
          )}

          {lead.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span className="truncate text-[11px] text-muted-foreground">
                {lead.phone}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0 text-muted-foreground/40" />
            <span className="text-[11px] text-muted-foreground/60">
              {formatDate(lead.createdAt)}
            </span>
          </div>

          {/* Source + Status row */}
          <div className="mt-0.5 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: sourceColor }}
              />
              <span className="text-[10px] capitalize text-muted-foreground">
                {lead.source}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Drag handle hint (visible on hover) */}
      <div className="flex items-center justify-center border-t border-white/[0.04] opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
      </div>
    </div>
  );
}

// ── Lead Detail Panel ─────────────────────────────────────────────────
function LeadDetailPanel({
  lead,
  stage,
  onClose,
  onUpdate,
}: {
  lead: Lead;
  stage: KanbanStage;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"home" | "timeline" | "tasks">(
    "home",
  );
  
  // Inline editing state for City (and other fields if needed)
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  
  function startEditing(field: string, val: string) {
    setEditingField(field);
    setEditValue(val);
  }

  async function handleSaveInline(field: string) {
    if (!lead._id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/lead/details/${lead._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ [field]: editValue }),
      });
      if (res.ok) {
        onUpdate();
      }
    } catch {
      // ignore
    } finally {
      setEditingField(null);
    }
  }
  const stageIdx = 0;
  const color = STAGE_COLORS[stage.colorIndex ?? (stageIdx % STAGE_COLORS.length)];

  const tabs = [
    { key: "home" as const, label: "Home" },
    { key: "timeline" as const, label: "Timeline" },
    { key: "tasks" as const, label: "Tasks" },
  ];

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-white/[0.06] bg-background">
      {/* ── Panel header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="truncate text-sm font-semibold text-foreground">
            {lead.name}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/60">
          {timeAgo(lead.createdAt)}
        </span>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-[12px] font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "home" && (
          <div className="p-4">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Fields
            </h3>
            <div className="space-y-0">
              {/* Stage */}
              <DetailRow label="Stage">
                <span
                  className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: "rgba(59,130,246,0.15)",
                    color: "#60a5fa",
                  }}
                >
                  {stage.name}
                </span>
              </DetailRow>

              {/* Email */}
              <DetailRow label="Email">
                <span className="text-[12px] text-foreground">
                  {lead.email || "—"}
                </span>
              </DetailRow>

              {/* Phone */}
              <DetailRow label="Phone">
                <span className="text-[12px] text-foreground">
                  {lead.phone || "—"}
                </span>
              </DetailRow>

              {/* Status */}
              <DetailRow label="Status">
                <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] capitalize text-blue-400">
                  {lead.status}
                </span>
              </DetailRow>

              {/* City */}
          <DetailRow label="City">
            <div className="flex items-center gap-2 text-[13px] text-foreground">
              {editingField === "city" ? (
                <div className="flex w-full items-center gap-2">
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveInline("city");
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    className="h-8 flex-1 bg-white/[0.03] text-[13px] text-foreground"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSaveInline("city")}
                      className="rounded bg-white/[0.1] p-1.5 text-foreground hover:bg-white/[0.15]"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="rounded bg-white/[0.05] p-1.5 text-muted-foreground hover:bg-white/[0.1] hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group flex flex-1 items-center justify-between">
                  <span>{lead.city || "—"}</span>
                  <button
                    onClick={() => startEditing("city", lead.city || "")}
                    className="opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 text-muted-foreground/50"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </DetailRow>

          {/* Source */}
              <DetailRow label="Source">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        SOURCE_COLORS[lead.source.toLowerCase()] || "#666",
                    }}
                  />
                  <span className="text-[12px] capitalize text-foreground">
                    {lead.source}
                  </span>
                </div>
              </DetailRow>

              {/* Close date */}
              <DetailRow label="Created">
                <span className="text-[12px] text-foreground">
                  {formatDate(lead.createdAt)}
                </span>
              </DetailRow>

              {/* Last update */}
              <DetailRow label="Last update">
                <span className="text-[12px] text-muted-foreground">
                  {timeAgo(lead.updatedAt)}
                </span>
              </DetailRow>

              {/* Probability */}
              <DetailRow label="Probability">
                <span className="text-[12px] text-foreground">
                  {stage.probability}%
                </span>
              </DetailRow>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Clock className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/60">
              Timeline coming soon
            </p>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <MoreHorizontal className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/60">
              Tasks coming soon
            </p>
          </div>
        )}
      </div>

      {/* ── Panel footer ─────────────────────────────────────────── */}
      <div className="flex items-center justify-end border-t border-white/[0.06] px-4 py-2">
        <Button
          size="sm"
          className="h-7 rounded-md px-4 text-[11px]"
          onClick={() => {
            /* future: open full lead page */
          }}
        >
          Open Lead →
        </Button>
      </div>
    </aside>
  );
}

// ── Detail row helper ─────────────────────────────────────────────────
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center border-b border-white/[0.03] py-2.5">
      <span className="w-24 shrink-0 text-[11px] text-muted-foreground/60">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Create Pipeline Modal
// ══════════════════════════════════════════════════════════════════════

const DEFAULT_BUYER_STAGES = [
  { name: "New Inquiry", probability: 10, colorIndex: 0 },
  { name: "Contacted", probability: 15, colorIndex: 1 },
  { name: "Qualified", probability: 25, colorIndex: 2 },
  { name: "Active Search", probability: 35, colorIndex: 3 },
  { name: "Showing Scheduled", probability: 45, colorIndex: 4 },
  { name: "Offer Preparing", probability: 55, colorIndex: 5 },
  { name: "Offer Submitted", probability: 70, colorIndex: 6 },
  { name: "Under Contract", probability: 85, colorIndex: 7 },
  { name: "Closed Won", probability: 100, colorIndex: 8 },
  { name: "Lost", probability: 0, colorIndex: 9 },
];

const DEFAULT_SELLER_STAGES = [
  { name: "New Inquiry", probability: 10, colorIndex: 0 },
  { name: "Consultation Scheduled", probability: 20, colorIndex: 1 },
  { name: "Listing Agreement Signed", probability: 35, colorIndex: 2 },
  { name: "Property Live", probability: 50, colorIndex: 3 },
  { name: "Offer Received", probability: 65, colorIndex: 4 },
  { name: "Under Contract", probability: 85, colorIndex: 7 },
  { name: "Closed Won", probability: 100, colorIndex: 8 },
  { name: "Lost", probability: 0, colorIndex: 9 },
];

function CreatePipelineModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (pipeline: Pipeline) => void;
}) {
  const [pipelineName, setPipelineName] = useState("");
  const [pipelineType, setPipelineType] = useState<"BUYER" | "SELLER">("BUYER");
  const [stages, setStages] = useState(
    DEFAULT_BUYER_STAGES.map((s) => ({ ...s, id: Math.random().toString() })),
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [openColorPicker, setOpenColorPicker] = useState<string | null>(null);
  const token = getToken();

  // Update stages when type changes
  function handleTypeChange(type: "BUYER" | "SELLER") {
    setPipelineType(type);
    setStages(
      (type === "BUYER" ? DEFAULT_BUYER_STAGES : DEFAULT_SELLER_STAGES).map(
        (s) => ({ ...s, id: Math.random().toString() }),
      ),
    );
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        name: "",
        probability: 0,
        colorIndex: prev.length % STAGE_COLORS.length,
      },
    ]);
  }

  function removeStage(id: string) {
    setStages((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStage(
    id: string,
    field: "name" | "probability" | "colorIndex",
    value: string | number,
  ) {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }

  async function handleCreate() {
    if (!pipelineName.trim()) {
      setError("Pipeline name is required");
      return;
    }

    const validStages = stages.filter((s) => s.name.trim());
    if (validStages.length === 0) {
      setError("At least one stage is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // 1. Create the pipeline with stages
      const pipelineRes = await fetch(`${API_BASE_URL}/pipeline/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: pipelineName.trim(),
          type: pipelineType,
          workspaceId,
          stages: validStages.map((s) => ({
            name: s.name.trim(),
            probability: s.probability,
            colorIndex: s.colorIndex,
          })),
        }),
      });

      if (!pipelineRes.ok) {
        const errData = await pipelineRes.json();
        throw new Error(errData.error || errData.message || "Failed to create pipeline");
      }
      const pipeline: Pipeline = await pipelineRes.json();

      onCreated(pipeline);
    } catch (e: any) {
      setError(e.message || "Failed to create pipeline. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg flex flex-col max-h-[90vh] rounded-xl border border-white/[0.08] bg-[#141414] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Create New Pipeline
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Pipeline Name
            </label>
            <input
              type="text"
              placeholder="e.g. Q2 Buyer Pipeline"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-white/[0.15] focus:outline-none"
            />
          </div>

          {/* Type selector */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Pipeline Type
            </label>
            <div className="flex gap-2">
              {(["BUYER", "SELLER"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`flex-1 rounded-lg border py-2 text-[12px] font-medium transition-all ${
                    pipelineType === type
                      ? type === "BUYER"
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {type === "BUYER" ? "🏠 Buyer" : "📋 Seller"}
                </button>
              ))}
            </div>
          </div>

          {/* Stages */}
          <div className="mb-4">
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Stages ({stages.length})
            </label>

            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.03] p-2 pl-3 transition-all hover:bg-white/[0.05]"
                >
                  {/* Color Selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        const nextId = openColorPicker === stage.id ? null : stage.id;
                        setOpenColorPicker(nextId);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] transition-colors hover:bg-white/[0.06]"
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: STAGE_COLORS[stage.colorIndex ?? 0].border }}
                      />
                    </button>
                    
                    {openColorPicker === stage.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-[120]" 
                          onClick={() => setOpenColorPicker(null)} 
                        />
                        <div className="absolute left-0 top-full z-[130] mt-2 grid w-[156px] grid-cols-5 gap-1.5 rounded-xl border border-white/[0.1] bg-[#1a1a1a] p-2 shadow-2xl">
                          {STAGE_COLORS.map((c, ci) => (
                            <button
                              key={ci}
                              onClick={() => {
                                updateStage(stage.id, "colorIndex", ci);
                                setOpenColorPicker(null);
                              }}
                              className={`group/c relative flex h-6 w-6 items-center justify-center rounded-lg transition-all hover:scale-110 ${stage.colorIndex === ci ? "bg-white/[0.1] ring-1 ring-white/20" : "hover:bg-white/[0.05]"}`}
                            >
                              <div
                                className="h-3.5 w-3.5 rounded-full"
                                style={{ backgroundColor: c.border }}
                              />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Name Input */}
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      placeholder="Stage name"
                      value={stage.name}
                      onChange={(e) => updateStage(stage.id, "name", e.target.value)}
                      className="h-7 min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
                    />
                  </div>

                  {/* Probability */}
                  <div className="flex items-center gap-1 rounded-lg border border-white/[0.04] bg-black/20 px-2 py-0.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={stage.probability}
                      onChange={(e) =>
                        updateStage(
                          stage.id,
                          "probability",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="h-5 w-8 border-0 bg-transparent text-center text-[12px] font-semibold text-foreground/80 focus:outline-none"
                    />
                    <span className="text-[10px] font-bold text-muted-foreground/30">%</span>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeStage(stage.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/30 transition-colors hover:bg-white/[0.05] hover:text-red-400 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addStage}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.08] py-2 text-[11px] text-muted-foreground transition-colors hover:border-white/[0.15] hover:bg-white/[0.02] hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add Stage
            </button>
          </div>

          {/* Error */}
          {error && <p className="mb-3 text-[12px] text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-[12px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating}
            className="h-8 rounded-md px-5 text-[12px]"
          >
            {creating ? "Creating…" : "Create Pipeline"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Create Lead Modal
// ══════════════════════════════════════════════════════════════════════

function CreateLeadModal({
  workspaceId,
  pipelineId,
  stageId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  pipelineId: string;
  stageId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const payload = {
        workspaceId,
        pipelineId,
        leads: [
          {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            city: city.trim(),
            source: source.trim() || "manual",
            pipelineId,
            stageId,
          },
        ],
      };

      const res = await fetch(`${API_BASE_URL}/lead/addLeads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create lead");
      }

      onCreated();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#141414] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Add New Lead
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="h-9 border-white/[0.08] bg-white/[0.03] text-[13px] text-foreground"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Email
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
              className="h-9 border-white/[0.08] bg-white/[0.03] text-[13px] text-foreground"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Phone
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              className="h-9 border-white/[0.08] bg-white/[0.03] text-[13px] text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                City
              </label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="h-9 border-white/[0.08] bg-white/[0.03] text-[13px] text-foreground"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Source
              </label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="manual"
                className="h-9 border-white/[0.08] bg-white/[0.03] text-[13px] text-foreground"
              />
            </div>
          </div>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-[12px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating}
            className="h-8 rounded-md px-5 text-[12px]"
          >
            {creating ? "Adding…" : "Add Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
