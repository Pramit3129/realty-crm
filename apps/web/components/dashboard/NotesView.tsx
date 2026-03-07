"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  StickyNote,
  X,
  Users,
  Search,
  Check,
  ChevronDown,
  Clock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, getToken } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────
interface Lead {
  _id: string;
  name: string;
  email: string;
}

interface Note {
  _id: string;
  title: string;
  body: string;
  relations: Lead[];
  realtorId: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NotesViewProps {
  workspaceId: string;
}

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
  return `${days}d ago`;
}

// ══════════════════════════════════════════════════════════════════════
// NotesView
// ══════════════════════════════════════════════════════════════════════
export default function NotesView({ workspaceId }: NotesViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRow, setShowNewRow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New note form
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newRelations, setNewRelations] = useState<Lead[]>([]);

  // Editing state
  const [editingCell, setEditingCell] = useState<{
    noteId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const token = getToken();

  const fetchNotes = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/note/workspace/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [workspaceId, token]);

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
    }
  }, [workspaceId, token]);

  useEffect(() => {
    fetchNotes();
    fetchLeads();
  }, [fetchNotes, fetchLeads]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/note/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          body: newBody.trim(),
          relations: newRelations.map((l) => l._id),
          workspaceId,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewBody("");
        setNewRelations([]);
        setShowNewRow(false);
        fetchNotes();
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(noteId: string, fields: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/note/details/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fields),
      });
      if (res.ok) fetchNotes();
    } catch {
      /* silent */
    }
  }

  async function handleDelete(noteId: string) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/note/details/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchNotes();
    } catch {
      /* silent */
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Notes</h1>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewRow(true)}
          className="h-7 gap-1.5 rounded-md px-3 text-xs"
        >
          <Plus className="h-3 w-3" />
          New record
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-1.5">
        <span className="text-xs text-muted-foreground">
          All Notes · {notes.length}
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
                />
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" />
                  Title
                </span>
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground min-w-[200px]">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  Relations
                </span>
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" />
                  Body
                </span>
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  Created by
                </span>
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Creation date
                </span>
              </th>
              <th className="w-10 px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => (
              <tr
                key={note._id}
                className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500"
                  />
                </td>
                {/* Title */}
                <td className="px-4 py-2.5 break-all min-w-[120px]">
                  <EditableCell
                    value={note.title}
                    editing={editingCell?.noteId === note._id && editingCell?.field === "title"}
                    onStart={() => {
                      setEditingCell({ noteId: note._id, field: "title" });
                      setEditValue(note.title);
                    }}
                    onSave={(v) => {
                      handleUpdate(note._id, { title: v });
                      setEditingCell(null);
                    }}
                    onCancel={() => setEditingCell(null)}
                  />
                </td>
                {/* Relations */}
                <td className="px-4 py-2.5">
                  <RelationsCell
                    relations={note.relations}
                    allLeads={leads}
                    onUpdate={(newLeads) =>
                      handleUpdate(note._id, { relations: newLeads.map((l) => l._id) })
                    }
                  />
                </td>
                {/* Body */}
                <td className="px-4 py-2.5 break-all max-w-xs">
                  <EditableCell
                    value={note.body}
                    editing={editingCell?.noteId === note._id && editingCell?.field === "body"}
                    onStart={() => {
                      setEditingCell({ noteId: note._id, field: "body" });
                      setEditValue(note.body);
                    }}
                    onSave={(v) => {
                      handleUpdate(note._id, { body: v });
                      setEditingCell(null);
                    }}
                    onCancel={() => setEditingCell(null)}
                  />
                </td>
                {/* Created By */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-500/20 text-[10px] font-bold text-orange-400">
                      {note.realtorId.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-muted-foreground">{note.realtorId.name}</span>
                  </div>
                </td>
                {/* Date */}
                <td className="px-4 py-2.5 text-muted-foreground">
                  {timeAgo(note.createdAt)}
                </td>
                {/* Delete */}
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => handleDelete(note._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {/* New Row */}
            {showNewRow && (
              <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2">
                  <Input
                    placeholder="Note title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] focus-visible:ring-1 focus-visible:ring-white/10"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2">
                  <RelationsCell
                    relations={newRelations}
                    allLeads={leads}
                    onUpdate={setNewRelations}
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    placeholder="Note body"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] focus-visible:ring-1 focus-visible:ring-white/10"
                  />
                </td>
                <td colSpan={3} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreate}
                      disabled={submitting}
                      className="h-7 text-[11px]"
                    >
                      Save
                    </Button>
                    <button
                      onClick={() => setShowNewRow(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {!showNewRow && (
              <tr>
                <td colSpan={7}>
                  <button
                    onClick={() => setShowNewRow(true)}
                    className="flex w-full items-center gap-2 px-14 py-2.5 text-[13px] text-muted-foreground/60 transition-colors hover:bg-white/[0.02]"
                  >
                    <Plus className="h-3 w-3" />
                    Add New
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function EditableCell({
  value,
  editing,
  onStart,
  onSave,
  onCancel,
}: {
  value: string;
  editing: boolean;
  onStart: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [local, setLocal] = useState(value);

  if (editing) {
    return (
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(local);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onSave(local)}
        className="h-7 border-0 bg-white/[0.06] px-2 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
        autoFocus
      />
    );
  }

  return (
    <span
      className={`cursor-text text-[13px] ${value ? "text-foreground" : "text-muted-foreground/30"}`}
      onDoubleClick={onStart}
    >
      {value || "Untitled"}
    </span>
  );
}

function RelationsCell({
  relations,
  allLeads,
  onUpdate,
}: {
  relations: Lead[];
  allLeads: Lead[];
  onUpdate: (leads: Lead[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggleLead = (lead: Lead) => {
    const isSelected = relations.find((r) => r._id === lead._id);
    if (isSelected) {
      onUpdate(relations.filter((r) => r._id !== lead._id));
    } else {
      onUpdate([...relations, lead]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="flex flex-wrap gap-1 items-center min-h-[28px] cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {relations.length === 0 && (
          <span className="text-muted-foreground/30">—</span>
        )}
        {relations.map((l) => (
          <span
            key={l._id}
            className="inline-flex items-center gap-1.5 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-blue-500 text-[8px] font-bold text-white">
              {l.name.charAt(0).toUpperCase()}
            </span>
            {l.name}
          </span>
        ))}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-64 overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-1 shadow-xl">
          <div className="px-2 py-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full bg-white/[0.04] pl-7 pr-3 py-1 text-[11px] rounded outline-none placeholder:text-muted-foreground/40"
                placeholder="Search leads..."
              />
            </div>
          </div>
          {allLeads.map((lead) => {
            const isSelected = relations.some((r) => r._id === lead._id);
            return (
              <button
                key={lead._id}
                onClick={() => toggleLead(lead)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-500/20 text-[10px] font-bold text-blue-400">
                  {lead.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{lead.name}</span>
                {isSelected && <Check className="h-3 w-3 text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
