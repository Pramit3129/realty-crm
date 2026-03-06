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
  LayoutList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, getToken } from "@/lib/auth";

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
  createdAt: string;
  updatedAt: string;
}

interface LeadsViewProps {
  workspaceId: string;
}

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

function getStatusStyle(status: string) {
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
  { key: "status", label: "Status", icon: Tag },
  { key: "source", label: "Source", icon: Globe },
  { key: "createdAt", label: "Created", icon: Clock },
];

// ══════════════════════════════════════════════════════════════════════
// LeadsView
// ══════════════════════════════════════════════════════════════════════
export default function LeadsView({ workspaceId }: LeadsViewProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set(),
  );
  const [showNewForm, setShowNewForm] = useState(false);
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
    setFormError("");
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
          email: newEmail.trim(),
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

  // ── Inline update ─────────────────────────────────────────────────
  async function saveInlineEdit(leadId: string, field: string, value: string) {
    setEditingCell(null);
    try {
      const res = await fetch(`${API_BASE_URL}/lead/details/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
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
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-[13px]">
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
                {TABLE_COLUMNS.map((col) => (
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
              {leads.map((lead) => (
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
                        editingCell?.leadId === lead._id &&
                        editingCell?.field === "name"
                      }
                      editValue={editValue}
                      onStart={() => startEditing(lead._id, "name", lead.name)}
                      onChange={setEditValue}
                      onSave={(v) => saveInlineEdit(lead._id, "name", v)}
                      onCancel={() => setEditingCell(null)}
                    />
                  </td>

                  {/* Email */}
                  <td className="px-4 py-2.5">
                    <EditableChipCell
                      value={lead.email}
                      editing={
                        editingCell?.leadId === lead._id &&
                        editingCell?.field === "email"
                      }
                      editValue={editValue}
                      onStart={() =>
                        startEditing(lead._id, "email", lead.email)
                      }
                      onChange={setEditValue}
                      onSave={(v) => saveInlineEdit(lead._id, "email", v)}
                      onCancel={() => setEditingCell(null)}
                    />
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-2.5">
                    <EditableChipCell
                      value={lead.phone}
                      editing={
                        editingCell?.leadId === lead._id &&
                        editingCell?.field === "phone"
                      }
                      editValue={editValue}
                      onStart={() =>
                        startEditing(lead._id, "phone", lead.phone)
                      }
                      onChange={setEditValue}
                      onSave={(v) => saveInlineEdit(lead._id, "phone", v)}
                      onCancel={() => setEditingCell(null)}
                    />
                  </td>

                  {/* City */}
                  <td className="px-4 py-2.5">
                    <EditableTextCell
                      value={lead.city || ""}
                      editing={
                        editingCell?.leadId === lead._id &&
                        editingCell?.field === "city"
                      }
                      editValue={editValue}
                      onStart={() =>
                        startEditing(lead._id, "city", lead.city || "")
                      }
                      onChange={setEditValue}
                      onSave={(v) => saveInlineEdit(lead._id, "city", v)}
                      onCancel={() => setEditingCell(null)}
                    />
                  </td>

                  {/* Status */}
                  <td
                    className="px-4 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusDropdown
                      status={lead.status}
                      onChange={(s) => saveInlineEdit(lead._id, "status", s)}
                    />
                  </td>

                  {/* Source */}
                  <td className="px-4 py-2.5">
                    <EditableTextCell
                      value={lead.source}
                      editing={
                        editingCell?.leadId === lead._id &&
                        editingCell?.field === "source"
                      }
                      editValue={editValue}
                      onStart={() =>
                        startEditing(lead._id, "source", lead.source)
                      }
                      onChange={setEditValue}
                      onSave={(v) => saveInlineEdit(lead._id, "source", v)}
                      onCancel={() => setEditingCell(null)}
                    />
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                    {timeAgo(lead.createdAt)}
                  </td>
                </tr>
              ))}

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
          pipelines={pipelines}
          onClose={() => setSelectedLead(null)}
          onUpdate={(field, value) =>
            saveInlineEdit(selectedLead._id, field, value)
          }
        />
      )}
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
}: {
  lead: Lead;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
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
      className="flex items-center gap-2 font-medium text-foreground"
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStart();
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-600/80 text-[10px] font-bold text-white">
        {lead.name.charAt(0).toUpperCase()}
      </span>
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
}: {
  value: string;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
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
        className="text-muted-foreground/30 text-[12px] cursor-text"
        onDoubleClick={(e) => {
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
      className="cursor-text rounded bg-white/[0.06] px-2 py-0.5 text-[12px] text-muted-foreground"
      onDoubleClick={(e) => {
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
}: {
  value: string;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
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
      className="cursor-text text-[12px] text-muted-foreground"
      onDoubleClick={(e) => {
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
  onChange,
}: {
  status: string;
  onChange: (s: string) => void;
}) {
  const style = getStatusStyle(status);

  return (
    <div className="relative inline-block">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
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
}: {
  value: string;
  onChange: (v: string) => void;
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
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-0.5 rounded-md bg-white/[0.04] px-2 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.08]"
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
                onChange(cc.code);
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
  pipelines,
  onClose,
  onUpdate,
}: {
  lead: Lead;
  pipelines: Pipeline[];
  onClose: () => void;
  onUpdate: (field: string, value: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"home" | "timeline" | "tasks">(
    "home",
  );

  const tabs = [
    { key: "home" as const, label: "Home" },
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
          <HomeTab lead={lead} pipelines={pipelines} onUpdate={onUpdate} />
        )}
        {activeTab === "timeline" && (
          <div className="flex flex-1 items-center justify-center px-4 py-12">
            <p className="text-xs text-muted-foreground/60">
              Timeline coming soon
            </p>
          </div>
        )}
        {activeTab === "tasks" && (
          <div className="flex flex-1 items-center justify-center px-4 py-12">
            <p className="text-xs text-muted-foreground/60">
              Tasks coming soon
            </p>
          </div>
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
}: {
  lead: Lead;
  pipelines: Pipeline[];
  onUpdate: (field: string, value: string) => void;
}) {
  return (
    <div className="px-4 py-4">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Fields
      </p>
      <p className="mb-4 text-[11px] text-muted-foreground/40">General</p>

      <div className="space-y-4">
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
        <DetailStatusRow
          status={lead.status}
          onChange={(s) => onUpdate("status", s)}
        />
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

      <div className="mt-8">
        <p className="mb-4 text-[13px] font-semibold text-foreground">
          Pipeline
        </p>
        <PipelineOpportunity
          pipelineId={lead.pipelineId}
          pipelines={pipelines}
          onChange={(p) => onUpdate("pipelineId", p)}
        />
      </div>
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
  onChange,
}: {
  status: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
        <Tag className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[12px] text-muted-foreground">Status</span>
      </div>
      <div className="flex-1">
        <StatusDropdown status={status} onChange={onChange} />
      </div>
    </div>
  );
}

// ── Pipeline Opportunity Box ───────────────────────────────────────────
function PipelineOpportunity({
  pipelineId,
  pipelines,
  onChange,
}: {
  pipelineId?: string;
  pipelines: Pipeline[];
  onChange: (s: string) => void;
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
            <button
              key={p._id}
              onClick={() => {
                onChange(p._id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-green-500/20 text-[10px] font-bold text-green-400">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">
                {p.name} {p.type === "BUYER" ? "(Buyer)" : "(Seller)"}
              </span>
              {pipelineId === p._id && <Check className="ml-auto h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
