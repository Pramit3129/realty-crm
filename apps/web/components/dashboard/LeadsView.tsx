"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Users,
  X,
  Mail,
  Phone,
  Globe,
  Clock,
  Tag,
  ChevronDown,
  Check,
  Upload,
  Trash2,
  CheckSquare,
  User,
  Send,
  History,
  Loader2,
  MessageSquare,
  CheckCircle,
  Circle,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, getToken } from "@/lib/auth";
import Papa from "papaparse";

// ── Types ─────────────────────────────────────────────────────────────
interface Pipeline {
  _id: string;
  name: string;
  type: string;
}

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  city?: string;
  status: string;
  pipelineId?: string;
  stageId?: {
    _id: string;
    name: string;
    colorIndex: number;
  };
  realtorId?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface LeadsViewProps {
  workspaceId: string;
  userRole?: string;
}

const getRealtorId = (lead: Lead) => {
  if (!lead.realtorId) return "";
  return typeof lead.realtorId === "string"
    ? lead.realtorId
    : lead.realtorId._id;
};

// ── Constants ─────────────────────────────────────────────────────────
// Status styles are now dynamic — colors are generated from the status string hash
const STATUS_COLOR_PALETTE = [
  { bg: "rgba(59,130,246,0.18)", text: "#60a5fa", dot: "#3b82f6" }, // blue
  { bg: "rgba(245,158,11,0.18)", text: "#fbbf24", dot: "#f59e0b" }, // amber
  { bg: "rgba(16,185,129,0.18)", text: "#34d399", dot: "#10b981" }, // emerald
  { bg: "rgba(139,92,246,0.18)", text: "#a78bfa", dot: "#8b5cf6" }, // violet
  { bg: "rgba(236,72,153,0.18)", text: "#f472b6", dot: "#ec4899" }, // pink
  { bg: "rgba(6,182,212,0.18)", text: "#22d3ee", dot: "#06b6d4" }, // cyan
  { bg: "rgba(249,115,22,0.18)", text: "#fb923c", dot: "#f97316" }, // orange
  { bg: "rgba(168,85,247,0.18)", text: "#c084fc", dot: "#a855f7" }, // purple
  { bg: "rgba(34,197,94,0.18)", text: "#4ade80", dot: "#22c55e" }, // green
  { bg: "rgba(239,68,68,0.18)", text: "#f87171", dot: "#ef4444" }, // red
  { bg: "rgba(20,184,166,0.18)", text: "#2dd4bf", dot: "#14b8a6" }, // teal
  { bg: "rgba(99,102,241,0.18)", text: "#818cf8", dot: "#6366f1" }, // indigo
  { bg: "rgba(132,204,22,0.18)", text: "#a3e635", dot: "#84cc16" }, // lime
  { bg: "rgba(244,63,94,0.18)", text: "#fb7185", dot: "#f43f5e" }, // rose
  { bg: "rgba(14,165,233,0.18)", text: "#38bdf8", dot: "#0ea5e9" }, // sky
  { bg: "rgba(217,70,239,0.18)", text: "#e879f9", dot: "#d946ef" }, // fuchsia
  { bg: "rgba(234,179,8,0.18)", text: "#fde047", dot: "#eab708" }, // yellow
  { bg: "rgba(100,116,139,0.18)", text: "#94a3b8", dot: "#64748b" }, // slate
  { bg: "rgba(120,113,108,0.18)", text: "#a8a29e", dot: "#78716c" }, // stone
  { bg: "rgba(63,63,70,0.18)", text: "#a1a1aa", dot: "#3f3f46" }, // zinc
];

// Map stages directly if they match default pipeline stages, otherwise fallback to hash
const DEFAULT_STAGE_INDEXES: Record<string, number> = {
  // Buyer
  "new inquiry": 0,
  contacted: 1,
  qualified: 2,
  "active search": 3,
  "showing scheduled": 4,
  "offer preparing": 5,
  "offer submitted": 6,
  "under contract": 7, // Shared
  "closed won": 8, // Shared
  lost: 9, // Shared
  // Seller
  "consultation scheduled": 1, // Skip 0 since it's "New Inquiry"
  "listing agreement signed": 2,
  "property live": 3,
  "offer received": 4,
};

function getStatusStyle(status: string, colorIndex?: number) {
  if (colorIndex !== undefined && colorIndex !== null && colorIndex >= 0) {
    return STATUS_COLOR_PALETTE[colorIndex % STATUS_COLOR_PALETTE.length];
  }

  if (!status)
    return { bg: "rgba(255,255,255,0.1)", text: "#999", dot: "#666" };

  const normalized = status.toLowerCase();

  // If it's a known default stage, use its exact position color
  if (normalized in DEFAULT_STAGE_INDEXES) {
    return STATUS_COLOR_PALETTE[DEFAULT_STAGE_INDEXES[normalized]];
  }

  let hash = 0;
  for (let i = 0; i < status.length; i++) {
    hash = status.charCodeAt(i) + ((hash << 5) - hash);
  }
  return STATUS_COLOR_PALETTE[Math.abs(hash) % STATUS_COLOR_PALETTE.length];
}

const DEFAULT_STATUS_STYLE = {
  bg: "rgba(255,255,255,0.1)",
  text: "#999",
  dot: "#666",
};

const COUNTRY_CODES = [
  { code: "+1", label: "US/CA" },
  { code: "+44", label: "UK" },
  { code: "+91", label: "IN" },
  { code: "+61", label: "AU" },
  { code: "+49", label: "DE" },
  { code: "+33", label: "FR" },
  { code: "+81", label: "JP" },
  { code: "+86", label: "CN" },
  { code: "+971", label: "AE" },
  { code: "+65", label: "SG" },
  { code: "+55", label: "BR" },
  { code: "+52", label: "MX" },
  { code: "+27", label: "ZA" },
  { code: "+82", label: "KR" },
  { code: "+39", label: "IT" },
];

// ── Helpers ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `about ${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `about ${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `about ${months} month${months > 1 ? "s" : ""} ago`;
}

const TABLE_COLUMNS = [
  { key: "name", label: "Name", icon: Users },
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "city", label: "City", icon: Globe }, // Use Globe for City/Location
  { key: "realtor", label: "Agent", icon: Users }, // New column for OWNER view
  { key: "status", label: "Status", icon: Tag },
  { key: "source", label: "Source", icon: Globe },
  { key: "createdAt", label: "Created", icon: Clock },
];

// ══════════════════════════════════════════════════════════════════════
// LeadsView
// ══════════════════════════════════════════════════════════════════════
export default function LeadsView({
  workspaceId,
  userRole = "AGENT",
}: LeadsViewProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set(),
  );
  const [showNewForm, setShowNewForm] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // inline editing
  const [editingCell, setEditingCell] = useState<{
    leadId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // new-lead form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("+91");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newSource, setNewSource] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = getToken();

  let currentUserId = "";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.id || payload._id || payload.sub;
    } catch (e) {}
  }
  // ── Fetch leads ───────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/lead/workspace/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [workspaceId, token]);

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
        const data = await res.json();
        setPipelines(data || []);
      }
    } catch {
      /* silent */
    }
  }, [workspaceId, token]);

  useEffect(() => {
    fetchLeads();
    fetchPipelines();
  }, [fetchLeads, fetchPipelines]);

  // Keep selected lead in sync after refetch
  useEffect(() => {
    if (selectedLead) {
      const updated = leads.find((l) => l._id === selectedLead._id);
      if (updated) setSelectedLead(updated);
    }
  }, [leads]);

  // ── Create lead ───────────────────────────────────────────────────
  async function handleCreate() {
    if (!newName.trim()) {
      setFormError("Name is required");
      return;
    }
    const extractEmail = (input: string) => {
      const match = input.match(/<(.+)>$/);
      return match ? match[1] : input.trim();
    };

    setSubmitting(true);
    try {
      const fullPhone = newPhone.trim()
        ? `${newCountryCode} ${newPhone.trim()}`
        : "";
      const res = await fetch(`${API_BASE_URL}/lead/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          email: extractEmail(newEmail),
          phone: fullPhone,
          city: newCity.trim(),
          source: newSource.trim() || "manual",
          workspaceId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || "Failed to create lead");
        return;
      }
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewCity("");
      setNewSource("");
      setShowNewForm(false);
      fetchLeads();
    } catch {
      setFormError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePipeline(pipelineId: string) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/pipeline/details/${pipelineId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        fetchPipelines();
        fetchLeads();
      } else {
        const body = await res.json();
        alert(body.message || "Failed to delete pipeline.");
      }
    } catch {
      alert("Failed to delete pipeline.");
    }
  }

  // ── Inline update ─────────────────────────────────────────────────
  async function saveInlineEdit(leadId: string, field: string, value: string) {
    setEditingCell(null);
    try {
      let finalValue = value;
      if (field === "email") {
        const match = value.match(/<(.+)>$/);
        finalValue = match ? match[1] : value.trim();
      }

      const res = await fetch(`${API_BASE_URL}/lead/details/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: finalValue }),
      });
      if (res.ok) fetchLeads();
    } catch {
      /* silent */
    }
  }

  function startEditing(leadId: string, field: string, currentValue: string) {
    setEditingCell({ leadId, field });
    setEditValue(currentValue);
  }

  // ── Row click ─────────────────────────────────────────────────────
  function handleRowClick(lead: Lead) {
    setSelectedLead(selectedLead?._id === lead._id ? null : lead);
  }

  // ── Selection & Bulk Ops ──────────────────────────────────────────
  function toggleAll() {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l._id)));
    }
  }

  function toggleLead(id: string) {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  }

  async function handleBulkDelete() {
    if (
      !confirm(`Are you sure you want to delete ${selectedLeadIds.size} leads?`)
    )
      return;

    setSubmitting(true);
    try {
      // Create a sequential delete queue
      for (const id of selectedLeadIds) {
        await fetch(`${API_BASE_URL}/lead/details/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setSelectedLeadIds(new Set());
      fetchLeads();
    } catch {
      alert("Failed to delete some leads.");
    } finally {
      setSubmitting(false);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Main table area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold text-foreground">Leads</h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedLeadIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={submitting}
                className="h-7 gap-1.5 rounded-md px-3 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                Delete Selected ({selectedLeadIds.size})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBatchModal(true)}
              className="h-7 gap-1.5 rounded-md px-3 text-xs border-white/[0.08] hover:bg-white/[0.04]"
            >
              <Upload className="h-3 w-3" />
              Batch Record Add
            </Button>
            <Button
              size="sm"
              onClick={() => setShowNewForm(true)}
              className="h-7 gap-1.5 rounded-md px-3 text-xs"
            >
              <Plus className="h-3 w-3" />
              New record
            </Button>
          </div>
        </div>

        {/* Sub-header: count */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-1.5">
          <span className="text-xs text-muted-foreground">
            All Leads · {leads.length}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[1200px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500"
                    checked={
                      leads.length > 0 && selectedLeadIds.size === leads.length
                    }
                    onChange={toggleAll}
                  />
                </th>
                {TABLE_COLUMNS.filter(
                  (col) => col.key !== "realtor" || userRole === "OWNER",
                ).map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-xs font-medium text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <col.icon className="h-3 w-3" />
                      {col.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* ── Existing leads ────────────────────────────────── */}
              {leads.map((lead) => {
                const isOwnLead =
                  lead.realtorId?._id === currentUserId || !lead.realtorId;
                const canEdit = isOwnLead || userRole !== "OWNER"; // AGENT cannot see others anyway, OWNER can only edit own leads

                return (
                  <tr
                    key={lead._id}
                    onClick={(e) => {
                      // Prevent row click if clicking checkbox or editable cells
                      if (
                        (e.target as HTMLElement).tagName.toLowerCase() ===
                        "input"
                      )
                        return;
                      handleRowClick(lead);
                    }}
                    className={`cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                      selectedLead?._id === lead._id ? "bg-white/[0.05]" : ""
                    } ${selectedLeadIds.has(lead._id) ? "bg-blue-500/[0.02]" : ""}`}
                  >
                    {/* Select */}
                    <td className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500"
                        checked={selectedLeadIds.has(lead._id)}
                        onChange={() => toggleLead(lead._id)}
                      />
                    </td>

                    {/* Name */}
                    <td className="px-4 py-2.5">
                      <EditableNameCell
                        lead={lead}
                        editing={
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === "name"
                        }
                        editValue={editValue}
                        onStart={() =>
                          canEdit && startEditing(lead._id, "name", lead.name)
                        }
                        onChange={setEditValue}
                        onSave={(v) => saveInlineEdit(lead._id, "name", v)}
                        onCancel={() => setEditingCell(null)}
                        canEdit={canEdit}
                      />
                    </td>

                    {/* Email */}
                    <td className="px-4 py-2.5">
                      <EditableChipCell
                        value={lead.email}
                        editing={
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === "email"
                        }
                        editValue={editValue}
                        onStart={() =>
                          canEdit && startEditing(lead._id, "email", lead.email)
                        }
                        onChange={setEditValue}
                        onSave={(v) => saveInlineEdit(lead._id, "email", v)}
                        onCancel={() => setEditingCell(null)}
                        canEdit={canEdit}
                      />
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-2.5">
                      <EditableChipCell
                        value={lead.phone}
                        editing={
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === "phone"
                        }
                        editValue={editValue}
                        onStart={() =>
                          canEdit && startEditing(lead._id, "phone", lead.phone)
                        }
                        onChange={setEditValue}
                        onSave={(v) => saveInlineEdit(lead._id, "phone", v)}
                        onCancel={() => setEditingCell(null)}
                        canEdit={canEdit}
                      />
                    </td>

                    {/* City */}
                    <td className="px-4 py-2.5">
                      <EditableTextCell
                        value={lead.city || ""}
                        editing={
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === "city"
                        }
                        editValue={editValue}
                        onStart={() =>
                          canEdit &&
                          startEditing(lead._id, "city", lead.city || "")
                        }
                        onChange={setEditValue}
                        onSave={(v) => saveInlineEdit(lead._id, "city", v)}
                        onCancel={() => setEditingCell(null)}
                        canEdit={canEdit}
                      />
                    </td>

                    {/* Realtor/Agent (Show only to OWNER) */}
                    {userRole === "OWNER" && (
                      <td className="px-4 py-2.5">
                        {lead.realtorId ? (
                          <div className="flex items-center gap-1.5 tooltip-trigger">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-[12px] truncate max-w-[80px]">
                              {lead.realtorId.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[12px]">
                            Unknown
                          </span>
                        )}
                      </td>
                    )}

                    {/* Status */}
                    <td
                      className="px-4 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {userRole === "OWNER" &&
                      getRealtorId(lead) !== currentUserId ? (
                        <span className="text-muted-foreground/30 text-[12px]">
                          —
                        </span>
                      ) : (
                        <StatusDropdown
                          status={lead.status}
                          colorIndex={lead.stageId?.colorIndex}
                          onChange={
                            canEdit
                              ? (s) => saveInlineEdit(lead._id, "status", s)
                              : undefined
                          }
                          disabled={!canEdit}
                        />
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-2.5">
                      <EditableTextCell
                        value={lead.source}
                        editing={
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === "source"
                        }
                        editValue={editValue}
                        onStart={() =>
                          canEdit &&
                          startEditing(lead._id, "source", lead.source)
                        }
                        onChange={setEditValue}
                        onSave={(v) => saveInlineEdit(lead._id, "source", v)}
                        onCancel={() => setEditingCell(null)}
                        canEdit={canEdit}
                      />
                    </td>

                    {/* Created At */}
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                      {timeAgo(lead.createdAt)}
                    </td>
                  </tr>
                );
              })}

              {/* ── "+ Add New" row — appears BELOW existing rows ─── */}
              {!showNewForm ? (
                <tr>
                  <td colSpan={8}>
                    <button
                      onClick={() => setShowNewForm(true)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-muted-foreground/60 transition-colors hover:bg-white/[0.02] hover:text-muted-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      Add New
                    </button>
                  </td>
                </tr>
              ) : (
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  {/* Checkbox Placeholder */}
                  <td className="px-4 py-2 w-10"></td>
                  {/* Name */}
                  <td className="px-4 py-2">
                    <Input
                      placeholder="Lead name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/10"
                      autoFocus
                    />
                  </td>
                  {/* Email */}
                  <td className="px-4 py-2">
                    <Input
                      placeholder="email@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/10"
                    />
                  </td>
                  {/* Phone with country code */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <CountryCodeSelect
                        value={newCountryCode}
                        onChange={setNewCountryCode}
                      />
                      <Input
                        placeholder="Phone number"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        className="h-8 flex-1 border-0 bg-white/[0.04] px-3 text-[13px] shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/10"
                      />
                    </div>
                  </td>
                  {/* City */}
                  <td className="px-4 py-2">
                    <Input
                      placeholder="City"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/10"
                    />
                  </td>
                  {/* Status (defaults to new) */}
                  <td className="px-4 py-2">
                    <span className="inline-block rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] text-blue-400">
                      new
                    </span>
                  </td>
                  {/* Source */}
                  <td className="px-4 py-2">
                    <Input
                      placeholder="Source"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/10"
                    />
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreate}
                        disabled={submitting}
                        className="h-7 rounded-md px-3 text-[11px]"
                      >
                        {submitting ? "…" : "Save"}
                      </Button>
                      <button
                        onClick={() => setShowNewForm(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && leads.length === 0 && !showNewForm && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                      No leads yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Click "+ New record" to add your first lead.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {formError && (
            <p className="px-5 py-2 text-xs text-destructive">{formError}</p>
          )}
        </div>

        {/* Footer stats */}
        {leads.length > 0 && (
          <div className="flex items-center gap-6 border-t border-white/[0.06] px-5 py-2 text-[11px] text-muted-foreground">
            <span>Count all {leads.length}</span>
          </div>
        )}
      </div>

      {/* ── Detail panel (right side) ───────────────────────────────── */}
      {selectedLead && (
        <DetailPanel
          lead={selectedLead}
          workspaceId={workspaceId}
          pipelines={pipelines}
          onClose={() => setSelectedLead(null)}
          onUpdate={(field, value) =>
            saveInlineEdit(selectedLead._id, field, value)
          }
          onDeletePipeline={handleDeletePipeline}
          userRole={userRole}
          currentUserId={currentUserId}
        />
      )}

      {/* ── CSV Upload Modal ────────────────────────────────────────── */}
      <CsvUploadModal
        workspaceId={workspaceId}
        open={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSuccess={fetchLeads}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SUB-‌COMPONENTS
// ══════════════════════════════════════════════════════════════════════

// ── Editable Name cell (with avatar) ──────────────────────────────────
function EditableNameCell({
  lead,
  editing,
  editValue,
  onStart,
  onChange,
  onSave,
  onCancel,
  canEdit,
}: {
  lead: Lead;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  canEdit?: boolean;
}) {
  if (editing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(editValue);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onSave(editValue)}
        className="h-7 border-0 bg-white/[0.06] px-2 text-[13px] font-medium shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <span
      className={`flex items-center gap-2 font-medium text-foreground ${canEdit === false ? "" : "cursor-text"}`}
      onDoubleClick={(e) => {
        if (canEdit === false) return;
        e.stopPropagation();
        onStart();
      }}
    >
      <User className="h-4 w-4 text-muted-foreground" />
      {lead.name}
    </span>
  );
}

// ── Editable chip cell (email / phone) ────────────────────────────────
function EditableChipCell({
  value,
  editing,
  editValue,
  onStart,
  onChange,
  onSave,
  onCancel,
  canEdit,
}: {
  value: string;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  canEdit?: boolean;
}) {
  if (editing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(editValue);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onSave(editValue)}
        className="h-7 border-0 bg-white/[0.06] px-2 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  if (!value) {
    return (
      <span
        className={`text-muted-foreground/30 text-[12px] ${canEdit === false ? "" : "cursor-text"}`}
        onDoubleClick={(e) => {
          if (canEdit === false) return;
          e.stopPropagation();
          onStart();
        }}
      >
        —
      </span>
    );
  }
  return (
    <span
      className={`rounded bg-white/[0.06] px-2 py-0.5 text-[12px] text-muted-foreground ${canEdit === false ? "" : "cursor-text"}`}
      onDoubleClick={(e) => {
        if (canEdit === false) return;
        e.stopPropagation();
        onStart();
      }}
    >
      {value}
    </span>
  );
}

// ── Editable plain text cell (source) ─────────────────────────────────
function EditableTextCell({
  value,
  editing,
  editValue,
  onStart,
  onChange,
  onSave,
  onCancel,
  canEdit,
}: {
  value: string;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  canEdit?: boolean;
}) {
  if (editing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(editValue);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onSave(editValue)}
        className="h-7 border-0 bg-white/[0.06] px-2 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <span
      className={`text-[12px] text-muted-foreground ${canEdit === false ? "" : "cursor-text"}`}
      onDoubleClick={(e) => {
        if (canEdit === false) return;
        e.stopPropagation();
        onStart();
      }}
    >
      {value || <span className="text-muted-foreground/30">—</span>}
    </span>
  );
}

// ── Status badge (now driven by pipeline stage name) ──────────────────
function StatusDropdown({
  status,
  colorIndex,
  onChange,
  disabled,
}: {
  status: string;
  colorIndex?: number;
  onChange?: (s: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const style = getStatusStyle(status, colorIndex);

  return (
    <div className="relative inline-block">
      <span
        className={`flex h-[22px] cursor-pointer items-center gap-1.5 rounded-full pl-1.5 pr-2.5 text-[11px] font-medium transition-colors hover:brightness-110 ${disabled ? "opacity-70 pointer-events-none" : ""}`}
        style={{
          backgroundColor: style.bg,
          color: style.text,
        }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: style.dot }}
        />
        {status || "New Inquiry"}
      </span>
    </div>
  );
}

// ── Country code select ───────────────────────────────────────────────
function CountryCodeSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        className={`flex h-8 items-center gap-0.5 rounded-md bg-white/[0.04] px-2 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.08] ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
        disabled={disabled}
      >
        {value}
        <ChevronDown className="h-2.5 w-2.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-28 overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          {COUNTRY_CODES.map((cc) => (
            <button
              key={cc.code}
              onClick={() => {
                onChange?.(cc.code);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <span>{cc.code}</span>
              <span className="text-muted-foreground/40">{cc.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────
function DetailPanel({
  lead,
  workspaceId,
  pipelines,
  onClose,
  onUpdate,
  onDeletePipeline,
  userRole,
  currentUserId,
}: {
  lead: Lead;
  workspaceId: string;
  pipelines: Pipeline[];
  onClose: () => void;
  onUpdate: (field: string, value: string) => void;
  onDeletePipeline: (pipelineId: string) => void;
  userRole?: string;
  currentUserId?: string;
}) {
  const [activeTab, setActiveTab] = useState<
    "home" | "timeline" | "tasks" | "notes" | "emails"
  >("home");

  const tabs = [
    { key: "home" as const, label: "Home" },
    { key: "emails" as const, label: "Emails" },
    { key: "notes" as const, label: "Notes" },
    { key: "timeline" as const, label: "Timeline" },
    { key: "tasks" as const, label: "Tasks" },
  ];

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-white/[0.06] bg-sidebar">
      {/* Panel header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={onClose}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-6 w-6 items-center justify-center rounded bg-violet-600/80 text-[10px] font-bold text-white">
          {lead.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 truncate">
          <p className="text-sm font-medium text-foreground">{lead.name}</p>
          <p className="text-[11px] text-muted-foreground">
            Created {timeAgo(lead.createdAt)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/[0.06] px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "home" && (
          <HomeTab
            lead={lead}
            pipelines={pipelines}
            onUpdate={onUpdate}
            onDeletePipeline={onDeletePipeline}
            userRole={userRole}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab lead={lead} workspaceId={workspaceId} />
        )}
        {activeTab === "emails" && (
          <EmailsTab lead={lead} workspaceId={workspaceId} />
        )}
        {activeTab === "timeline" && (
          <TimelineTab lead={lead} workspaceId={workspaceId} />
        )}
        {activeTab === "tasks" && (
          <TasksTab lead={lead} workspaceId={workspaceId} />
        )}
      </div>

      {/* Panel footer */}
      <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-4 py-2.5">
        <Button size="sm" className="h-7 gap-1.5 rounded-md px-4 text-xs">
          Open
        </Button>
      </div>
    </div>
  );
}

// ── Home tab content ──────────────────────────────────────────────────
function HomeTab({
  lead,
  pipelines,
  onUpdate,
  onDeletePipeline,
  userRole,
  currentUserId,
}: {
  lead: Lead;
  pipelines: Pipeline[];
  onUpdate: (field: string, value: string) => void;
  onDeletePipeline: (pipelineId: string) => void;
  userRole?: string;
  currentUserId?: string;
}) {
  return (
    <div className="px-4 py-4">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Fields
      </p>
      <p className="mb-4 text-[11px] text-muted-foreground/40">General</p>

      <div className="space-y-4">
        {userRole === "OWNER" && (
          <DetailRow
            icon={User}
            label="Agent"
            value={lead.realtorId?.name || "Unknown"}
          />
        )}
        <EditableDetailRow
          icon={Mail}
          label="Email"
          value={lead.email}
          onSave={(v) => onUpdate("email", v)}
        />
        <EditableDetailRow
          icon={Phone}
          label="Phone"
          value={lead.phone}
          onSave={(v) => onUpdate("phone", v)}
        />
        {userRole === "OWNER" && getRealtorId(lead) !== currentUserId ? (
          <DetailRow
            icon={Tag}
            label="Status"
            value={<span className="text-muted-foreground/30">—</span>}
          />
        ) : (
          <DetailStatusRow
            status={lead.status}
            colorIndex={lead.stageId?.colorIndex}
            onChange={(s) => onUpdate("status", s)}
          />
        )}
        <EditableDetailRow
          icon={Globe}
          label="Source"
          value={lead.source}
          onSave={(v) => onUpdate("source", v)}
        />
        <DetailRow
          icon={Clock}
          label="Last update"
          value={timeAgo(lead.updatedAt)}
        />
        <DetailRow
          icon={Clock}
          label="Created"
          value={timeAgo(lead.createdAt)}
        />
      </div>

      {!(userRole === "OWNER" && getRealtorId(lead) !== currentUserId) && (
        <div className="mt-8">
          <p className="mb-4 text-[13px] font-semibold text-foreground">
            Pipeline
          </p>
          <PipelineOpportunity
            pipelineId={lead.pipelineId}
            pipelines={pipelines}
            onChange={(p) => onUpdate("pipelineId", p)}
            onDelete={onDeletePipeline}
          />
        </div>
      )}
    </div>
  );
}

// ── Detail Row (read-only) ────────────────────────────────────────────
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
        <Icon className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 text-[12px] text-foreground">
        {value || <span className="text-muted-foreground/30">—</span>}
      </div>
    </div>
  );
}

// ── Editable Detail Row ───────────────────────────────────────────────
function EditableDetailRow({
  icon: Icon,
  label,
  value,
  onSave,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  function save() {
    setEditing(false);
    if (localValue !== value) onSave(localValue);
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex w-24 shrink-0 items-center gap-1.5 pt-1.5">
          <Icon className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[12px] text-muted-foreground">{label}</span>
        </div>
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setLocalValue(value);
              setEditing(false);
            }
          }}
          className="h-7 flex-1 border-0 bg-white/[0.06] px-2 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
        <Icon className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <div
        className="flex-1 cursor-text rounded px-1 py-0.5 text-[12px] text-foreground transition-colors hover:bg-white/[0.04]"
        onClick={() => {
          setLocalValue(value);
          setEditing(true);
        }}
      >
        {value || <span className="text-muted-foreground/30">{label}</span>}
      </div>
    </div>
  );
}

// ── Detail Status Row (dropdown) ──────────────────────────────────────
function DetailStatusRow({
  status,
  colorIndex,
  onChange,
}: {
  status: string;
  colorIndex?: number;
  onChange: (s: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
        <Tag className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[12px] text-muted-foreground">Status</span>
      </div>
      <div className="flex-1">
        <StatusDropdown
          status={status}
          colorIndex={colorIndex}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

// ── Pipeline Opportunity Box ───────────────────────────────────────────
function PipelineOpportunity({
  pipelineId,
  pipelines,
  onChange,
  onDelete,
}: {
  pipelineId?: string;
  pipelines: Pipeline[];
  onChange: (s: string) => void;
  onDelete: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedPipeline = pipelines.find((p) => p._id === pipelineId);
  const title = selectedPipeline?.name || "Select Pipeline";
  const initial = title.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5 transition-colors hover:bg-white/[0.08] w-max"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-green-500/20 text-[10px] font-bold text-green-400">
          {initial}
        </span>
        <span className="text-[12px] font-medium text-foreground">{title}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-64 overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          {pipelines.map((p) => (
            <div
              key={p._id}
              className="group relative flex w-full items-center"
            >
              <button
                onClick={() => {
                  onChange(p._id);
                  setOpen(false);
                }}
                className="flex flex-1 items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground pr-8"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-green-500/20 text-[10px] font-bold text-green-400">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">
                  {p.name} {p.type === "BUYER" ? "(Buyer)" : "(Seller)"}
                </span>
                {pipelineId === p._id && <Check className="ml-auto h-3 w-3" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    confirm(
                      `Are you sure you want to delete the pipeline "${p.name}"?`,
                    )
                  ) {
                    onDelete(p._id);
                    setOpen(false);
                  }
                }}
                className="absolute right-2 hidden p-1 text-muted-foreground hover:text-red-400 group-hover:block"
                title="Delete Pipeline"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CSV Upload Modal ──────────────────────────────────────────────────
function CsvUploadModal({
  workspaceId,
  open,
  onClose,
  onSuccess,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleUpload() {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }
    setError("");
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        // Map row headers (case-insensitive) to expected keys
        const leads = rows
          .map((r: any) => {
            const getVal = (key: string) => {
              const foundKey = Object.keys(r).find(
                (k) => k.toLowerCase() === key.toLowerCase(),
              );
              return foundKey ? r[foundKey]?.trim() : "";
            };
            return {
              name: getVal("name"),
              email: getVal("email"),
              phone: getVal("phone"),
              city: getVal("city"),
              source: getVal("source") || "CSV Upload",
              workspaceId,
            };
          })
          .filter((l) => l.name); // only keep leads that have at least a name

        if (leads.length === 0) {
          setError(
            "No valid leads found. Please ensure your CSV has a 'name' column.",
          );
          setUploading(false);
          return;
        }

        try {
          const res = await fetch(`${API_BASE_URL}/lead/addLeads`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ leads, workspaceId }),
          });

          if (!res.ok) {
            const data = await res.json();
            setError(data.message || "Failed to upload leads");
            setUploading(false);
            return;
          }

          setUploading(false);
          setFile(null);
          onSuccess();
          onClose();
        } catch (err) {
          setError("Network error occurred while uploading. Please try again.");
          setUploading(false);
        }
      },
      error: (err: any) => {
        setError("Failed to parse CSV file: " + err.message);
        setUploading(false);
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#121212] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Batch Record Add
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to import multiple leads at once.
          </p>
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-foreground">
              Required CSV Format:
            </p>
            <div className="flex flex-wrap gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                name
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                email
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                phone
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                city
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                source
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground/60">
              Only 'name' is strictly required, but including headers is
              mandatory.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError("");
              }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-white/[0.06] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-white/[0.1] focus:outline-none"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {uploading ? (
            <Button size="sm" disabled className="h-8 text-xs w-28">
              Importing...
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs hover:bg-white/[0.06]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!file}
                className="h-8 text-xs w-28"
              >
                Import CSV
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// ── Notes tab content ─────────────────────────────────────────────────
function NotesTab({ lead, workspaceId }: { lead: Lead; workspaceId: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const token = getToken();

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/note/lead/${lead._id}/workspace/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [lead._id, workspaceId, token]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleAddNote() {
    if (!newNoteBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/note/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Untitled",
          body: newNoteBody.trim(),
          relations: [lead._id],
          workspaceId,
        }),
      });
      if (res.ok) {
        setNewNoteBody("");
        setIsAdding(false);
        fetchNotes();
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          All{" "}
          <span className="ml-1 text-muted-foreground/60">{notes.length}</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="h-6 gap-1 px-2 text-[10px] border-white/[0.08] hover:bg-white/[0.04]"
        >
          <Plus className="h-2.5 w-2.5" />
          Add note
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground/40 text-center py-4">
            Loading notes...
          </p>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center">
            <p className="text-[11px] text-muted-foreground/40">
              No notes for this lead
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note._id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
            >
              <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap break-all">
                {note.body}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-gray-500/10 text-gray-400">
                    <User className="h-2 w-2" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">
                    {note.realtorId.name}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/40">
                  {timeAgo(note.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="relative pt-2 space-y-2">
          <textarea
            placeholder="Type a note..."
            value={newNoteBody}
            onChange={(e) => setNewNoteBody(e.target.value)}
            className="w-full min-h-[100px] rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-[12px] outline-none placeholder:text-muted-foreground/40 focus:border-white/10"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/30">
              Markdown supported
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewNoteBody("");
                  setIsAdding(false);
                }}
                className="h-7 text-[11px] hover:bg-white/[0.04]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={submitting || !newNoteBody.trim()}
                className="h-7 text-[11px]"
              >
                {submitting ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────
function TasksTab({ lead, workspaceId }: { lead: Lead; workspaceId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const token = getToken();

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/task/lead/${lead._id}/workspace/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      /* silent */
    }
  }, [lead._id, workspaceId, token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/task/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          workspaceId,
          relations: [lead._id],
        }),
      });
      if (res.ok) {
        setNewTaskTitle("");
        setShowNewTask(false);
        fetchTasks();
      }
    } catch {
      /* silent */
    }
  }

  async function handleUpdateTask(
    taskId: string,
    field: string,
    value: string,
  ) {
    if (editingCell) setEditingCell(null);
    try {
      await fetch(`${API_BASE_URL}/task/details/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });
      fetchTasks();
    } catch {
      /* silent */
    }
  }

  return (
    <div className="px-4 py-4 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          TODO {tasks.length}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewTask(true)}
          className="h-6 gap-1 px-2 text-[10px] border-white/[0.08]"
        >
          <Plus className="h-3 w-3" /> Add task
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {tasks.map((task) => (
          <div
            key={task._id}
            className="group flex items-start gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-[12px] transition-colors hover:bg-white/[0.04]"
          >
            <button
              onClick={() =>
                handleUpdateTask(
                  task._id,
                  "status",
                  task.status === "Done" ? "To do" : "Done",
                )
              }
              className="mt-0.5 text-muted-foreground hover:text-foreground"
            >
              {task.status === "Done" ? (
                <CheckSquare className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-[4px] border-2 border-muted-foreground/40" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <EditableTextCell
                value={task.title}
                editing={
                  editingCell?.id === task._id && editingCell?.field === "title"
                }
                editValue={editValue}
                onStart={() => {
                  setEditingCell({ id: task._id, field: "title" });
                  setEditValue(task.title);
                }}
                onChange={setEditValue}
                onSave={(v) => handleUpdateTask(task._id, "title", v)}
                onCancel={() => setEditingCell(null)}
              />
            </div>
            {task.assigneeId && (
              <span className="flex items-center gap-1.5 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                <div className="flex h-3 w-3 items-center justify-center rounded bg-purple-500/20 text-purple-400">
                  <User className="h-2 w-2" />
                </div>
                {task.assigneeId.name}
              </span>
            )}
            {!task.assigneeId && task.realtorId && (
              <span className="flex items-center gap-1.5 rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                <div className="flex h-3 w-3 items-center justify-center rounded bg-slate-500/20 text-slate-400">
                  <User className="h-2 w-2" />
                </div>
                {task.realtorId.name}
              </span>
            )}
            <button
              onClick={async () => {
                if (!confirm("Delete this task?")) return;
                await fetch(`${API_BASE_URL}/task/details/${task._id}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
                fetchTasks();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400 -mr-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {showNewTask && (
          <div className="flex items-start gap-3 rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="mt-0.5 h-4 w-4 rounded-[4px] border-2 border-muted-foreground/40" />
            <div className="flex-1">
              <Input
                autoFocus
                placeholder="Task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                className="h-6 w-full border-0 bg-transparent px-0 text-[12px] shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              />
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateTask}
                  className="h-6 px-3 text-[10px]"
                >
                  Save
                </Button>
                <button
                  onClick={() => setShowNewTask(false)}
                  className="px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {tasks.length === 0 && !showNewTask && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CheckSquare className="mb-2 h-6 w-6 opacity-20" />
            <p className="text-xs">No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Emails Tab ────────────────────────────────────────────────────────
function EmailsTab({ lead, workspaceId }: { lead: Lead; workspaceId: string }) {
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrafting, setIsDrafting] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<{
    isConnected: boolean;
    email?: string;
  }>({ isConnected: false });
  const token = getToken();

  const fetchCommunications = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/lead/details/${lead._id}/emails`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setCommunications(data.emails || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [lead._id, token]);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/emailIntegration/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatus(data);
      }
    } catch {
      /* silent */
    }
  }, [token]);

  useEffect(() => {
    fetchCommunications();
    fetchIntegrationStatus();
  }, [fetchCommunications, fetchIntegrationStatus]);

  async function handleConnect() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/emailIntegration/google/auth-url`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank");
      }
    } catch {
      alert("Failed to get auth URL");
    }
  }

  if (isDrafting) {
    return (
      <EmailDraftForm
        lead={lead}
        onCancel={() => setIsDrafting(false)}
        onSent={() => {
          setIsDrafting(false);
          fetchCommunications();
        }}
      />
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {!integrationStatus.isConnected ? (
        <div className="rounded-lg border border-dashed border-white/[0.08] p-6 text-center space-y-3">
          <Mail className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <div className="space-y-1">
            <p className="text-[12px] font-medium text-foreground">
              Connect Gmail
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Connect your Gmail account to send emails directly from the CRM.
            </p>
          </div>
          <Button size="sm" onClick={handleConnect} className="h-7 text-[11px]">
            Connect Account
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <History className="h-3 w-3 text-muted-foreground/60" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                History
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsDrafting(true)}
              className="h-7 gap-1.5 rounded-md px-3 text-[11px]"
            >
              <Send className="h-3 w-3" />
              Draft Email
            </Button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/20" />
              </div>
            ) : communications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center bg-white/[0.01]">
                <p className="text-[11px] text-muted-foreground/40 italic">
                  No email history available.
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground/30">
                  Click "Draft Email" to start a conversation.
                </p>
              </div>
            ) : (
              communications.map((comm) => (
                <div
                  key={comm._id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 relative overflow-hidden group cursor-pointer hover:bg-white/[0.04] transition-colors"
                  onClick={() => {
                    const win = window.open("", "_blank");
                    if (win) {
                      win.document.write(`
                        <html>
                          <head>
                            <title>${comm.subject}</title>
                            <style>
                              body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                              .header { border-bottom: 1px solid #eee; margin-bottom: 20px; padding-bottom: 10px; }
                              .subject { font-size: 20px; font-weight: bold; }
                              .meta { color: #666; font-size: 14px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div class="subject">${comm.subject}</div>
                              <div class="meta">From: ${comm.senderEmail} | Received: ${new Date(comm.receivedAt).toLocaleString()}</div>
                            </div>
                            <div>${comm.body}</div>
                          </body>
                        </html>
                      `);
                      win.document.close();
                    }
                  }}
                >
                  <div className="absolute top-1 right-2 p-1 opacity-5 group-hover:opacity-20 transition-opacity">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {comm.subject || "(No Subject)"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                        {comm.senderEmail}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap">
                      {timeAgo(comm.receivedAt)}
                    </span>
                  </div>
                  <div 
                    className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-1 opacity-80"
                    dangerouslySetInnerHTML={{ __html: comm.body?.replace(/<[^>]*>?/gm, ' ') }} 
                  />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Email Draft Form ──────────────────────────────────────────────────
function EmailDraftForm({
  lead,
  onCancel,
  onSent,
}: {
  lead: Lead;
  onCancel: () => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const token = getToken();

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/emailIntegration/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadId: lead._id,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      if (res.ok) {
        onSent();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to send email");
      }
    } catch {
      alert("Network error occurred");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="px-4 py-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          Compose Email
        </p>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Recipient
          </label>
          <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1.5 text-[12px] text-foreground border border-white/[0.06]">
            <Mail className="h-3 w-3 text-muted-foreground/40" />
            {lead.email}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Subject
          </label>
          <Input
            placeholder="Re: Property Inquiry"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-9 border-white/[0.08] bg-white/[0.04] px-3 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
          />
        </div>

        <div className="space-y-1 flex-1 flex flex-col">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Message
          </label>
          <textarea
            placeholder="Type your message here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full flex-1 min-h-[200px] rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-[12px] outline-none placeholder:text-muted-foreground/40 focus:border-white/10 resize-none leading-relaxed"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={sending}
          className="h-8 text-[11px] hover:bg-white/[0.04]"
        >
          Discard
        </Button>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          className="h-8 gap-2 rounded-md px-4 text-[11px]"
        >
          {sending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Timeline Tab ──────────────────────────────────────────────────────
function TimelineTab({ lead, workspaceId }: { lead: Lead; workspaceId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/activity/lead/${lead._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [lead._id, token]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "LEAD_CREATED":
        return <UserPlus className="h-3 w-3 text-blue-400" />;
      case "LEAD_UPDATED":
      case "STATUS_CHANGED":
      case "STAGE_CHANGED":
        return <RefreshCw className="h-3 w-3 text-orange-400" />;
      case "EMAIL_SENT":
        return <Mail className="h-3 w-3 text-green-400" />;
      case "NOTE_ADDED":
        return <MessageSquare className="h-3 w-3 text-violet-400" />;
      case "TASK_ADDED":
        return <Circle className="h-3 w-3 text-yellow-400" />;
      case "TASK_COMPLETED":
        return <CheckCircle className="h-3 w-3 text-emerald-400" />;
      default:
        return <History className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          Activity Log{" "}
          <span className="ml-1 text-muted-foreground/60">{activities.length}</span>
        </p>
      </div>

      <div className="relative space-y-4">
        {/* Vertical line connecting events */}
        {activities.length > 1 && (
          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-white/[0.06]" />
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground/40 text-center py-4">
            Loading activity...
          </p>
        ) : activities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center">
            <p className="text-[11px] text-muted-foreground/40">
              No activity recorded for this lead
            </p>
          </div>
        ) : (
          activities.map((activity, idx) => (
            <div key={activity._id} className="relative flex gap-3 group">
              {/* Icon container */}
              <div className="relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-sidebar shadow-sm ring-4 ring-sidebar">
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-foreground leading-tight">
                    {activity.content}
                  </p>
                  <span className="text-[10px] whitespace-nowrap text-muted-foreground/40">
                    {timeAgo(activity.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-muted-foreground/50">
                    by {activity.realtorId?.name || "System"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
