"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  Tag as TagIcon,
  Sparkles,
  ChevronDown,
  Check,
  Filter as FilterIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
export interface TagDef {
  _id: string;
  name: string;
  color: string;
  type: "MANUAL" | "DYNAMIC";
  filters?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

interface FilterOption {
  label: string;
  value: string;
}
interface FilterSchemaField {
  key: string;
  label: string;
  type: string;
  options?: string[] | FilterOption[];
}

function normalizeOptions(
  opts?: string[] | FilterOption[],
): FilterOption[] | undefined {
  if (!opts || opts.length === 0) return opts ? [] : undefined;
  if (typeof opts[0] === "string")
    return (opts as string[]).map((s) => ({ label: s, value: s }));
  return opts as FilterOption[];
}
interface FilterSchema {
  standard: FilterSchemaField[];
  custom: FilterSchemaField[];
}

type Operator =
  | "eq"
  | "ne"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "exists";

interface FilterRow {
  id: string;
  key: string;
  op: Operator;
  value: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Color palette
// ─────────────────────────────────────────────────────────────────────────
export const TAG_COLOR_PALETTE = [
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#EF4444", // red
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#A855F7", // purple
  "#F97316", // orange
  "#22C55E", // green
  "#14B8A6", // teal
  "#64748B", // slate
];

const OPERATORS: { value: Operator; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "ne", label: "not equal" },
  { value: "contains", label: "contains" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "in", label: "any of" },
  { value: "exists", label: "exists" },
];

// ─────────────────────────────────────────────────────────────────────────
// Utility — convert backend filter object → editor rows + reverse
// ─────────────────────────────────────────────────────────────────────────
function filtersToRows(filters: Record<string, any> = {}): FilterRow[] {
  const rows: FilterRow[] = [];
  let i = 0;
  for (const [key, raw] of Object.entries(filters || {})) {
    const id = `${i++}-${key}`;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      if ("$gt" in raw) rows.push({ id, key, op: "gt", value: String(raw.$gt) });
      else if ("$gte" in raw) rows.push({ id, key, op: "gte", value: String(raw.$gte) });
      else if ("$lt" in raw) rows.push({ id, key, op: "lt", value: String(raw.$lt) });
      else if ("$lte" in raw) rows.push({ id, key, op: "lte", value: String(raw.$lte) });
      else if ("$ne" in raw) rows.push({ id, key, op: "ne", value: String(raw.$ne) });
      else if ("$in" in raw && Array.isArray(raw.$in))
        rows.push({ id, key, op: "in", value: raw.$in.join(",") });
      else if ("$exists" in raw)
        rows.push({ id, key, op: "exists", value: raw.$exists ? "true" : "false" });
      else if ("$regex" in raw)
        rows.push({ id, key, op: "contains", value: String(raw.$regex) });
      else rows.push({ id, key, op: "eq", value: JSON.stringify(raw) });
    } else {
      rows.push({ id, key, op: "eq", value: String(raw ?? "") });
    }
  }
  return rows;
}

function coerce(value: string): any {
  const v = value.trim();
  if (v === "") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  if (!Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function rowsToFilters(rows: FilterRow[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const r of rows) {
    if (!r.key) continue;
    switch (r.op) {
      case "eq":
        out[r.key] = coerce(r.value);
        break;
      case "ne":
        out[r.key] = { $ne: coerce(r.value) };
        break;
      case "gt":
        out[r.key] = { $gt: coerce(r.value) };
        break;
      case "gte":
        out[r.key] = { $gte: coerce(r.value) };
        break;
      case "lt":
        out[r.key] = { $lt: coerce(r.value) };
        break;
      case "lte":
        out[r.key] = { $lte: coerce(r.value) };
        break;
      case "in":
        out[r.key] = {
          $in: r.value
            .split(",")
            .map((s) => coerce(s.trim()))
            .filter((v) => v !== ""),
        };
        break;
      case "exists":
        out[r.key] = { $exists: r.value !== "false" };
        break;
      case "contains":
        out[r.key] = { $regex: r.value, $options: "i" };
        break;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────
interface TagsManagerProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onChanged: () => void;
}

export default function TagsManager({
  open,
  onClose,
  workspaceId,
  onChanged,
}: TagsManagerProps) {
  const [tags, setTags] = useState<TagDef[]>([]);
  const [schema, setSchema] = useState<FilterSchema>({ standard: [], custom: [] });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<TagDef | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchTags = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [tagsRes, schemaRes] = await Promise.all([
        api("/tag/list", { headers: { "x-workspace-id": workspaceId } }),
        api("/tag/filter-schema", { headers: { "x-workspace-id": workspaceId } }),
      ]);
      if (tagsRes.ok) setTags(await tagsRes.json());
      if (schemaRes.ok) setSchema(await schemaRes.json());
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (open) fetchTags();
  }, [open, fetchTags]);

  async function handleDelete(tag: TagDef) {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    const res = await api(`/tag/${tag._id}`, {
      method: "DELETE",
      headers: { "x-workspace-id": workspaceId },
    });
    if (res.ok) {
      setTags((t) => t.filter((x) => x._id !== tag._id));
      onChanged();
    }
  }

  function startCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(tag: TagDef) {
    setEditing(tag);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-[640px] p-0 overflow-hidden bg-[#0e0e0e] border-white/[0.08]"
        style={{
          ["--tw-enter-translate-x" as any]: "0",
          ["--tw-enter-translate-y" as any]: "0",
          ["--tw-exit-translate-x" as any]: "0",
          ["--tw-exit-translate-y" as any]: "0",
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="text-sm font-semibold">Tags & Smart Views</DialogTitle>
          </div>
          <p className="text-[11px] text-muted-foreground/70 pt-1">
            Manual labels you assign · Dynamic views matched in real-time
          </p>
        </DialogHeader>

        {showForm ? (
          <TagForm
            workspaceId={workspaceId}
            schema={schema}
            existing={editing}
            onClose={closeForm}
            onSaved={() => {
              closeForm();
              fetchTags();
              onChanged();
            }}
          />
        ) : (
          <div className="flex flex-col max-h-[60vh]">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.04]">
              <span className="text-[11px] text-muted-foreground">
                {loading ? "Loading…" : `${tags.length} tag${tags.length === 1 ? "" : "s"}`}
              </span>
              <Button
                size="sm"
                onClick={startCreate}
                className="h-7 gap-1.5 rounded-md px-3 text-xs"
              >
                <Plus className="h-3 w-3" />
                New tag
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              {!loading && tags.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <TagIcon className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">No tags yet</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    Create a manual label or a dynamic Smart View.
                  </p>
                </div>
              )}

              {tags.map((tag) => (
                <div
                  key={tag._id}
                  className="group flex items-center gap-3 border-b border-white/[0.04] px-5 py-2.5 transition-colors hover:bg-white/[0.02]"
                >
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: hexToRgba(tag.color, 0.18),
                      color: tag.color,
                    }}
                  >
                    {tag.type === "DYNAMIC" ? (
                      <Sparkles className="h-2.5 w-2.5" />
                    ) : (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    {tag.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {tag.type === "DYNAMIC" ? "Smart View" : "Manual"}
                  </span>
                  {tag.type === "DYNAMIC" && tag.filters && (
                    <span className="truncate text-[11px] text-muted-foreground/70 max-w-[200px]">
                      {summarizeFilters(tag.filters)}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(tag)}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Tag form (create / edit)
// ─────────────────────────────────────────────────────────────────────────
function TagForm({
  workspaceId,
  schema,
  existing,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  schema: FilterSchema;
  existing: TagDef | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name || "");
  const [color, setColor] = useState(existing?.color || TAG_COLOR_PALETTE[0]);
  const [type, setType] = useState<"MANUAL" | "DYNAMIC">(existing?.type || "MANUAL");
  const [rows, setRows] = useState<FilterRow[]>(
    existing?.filters ? filtersToRows(existing.filters) : [],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fieldOptions = useMemo(
    () => [...schema.standard, ...schema.custom],
    [schema],
  );

  function addRow() {
    const first = fieldOptions[0]?.key || "";
    setRows((r) => [
      ...r,
      { id: `${Date.now()}-${Math.random()}`, key: first, op: "eq", value: "" },
    ]);
  }

  function updateRow(id: string, patch: Partial<FilterRow>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((row) => row.id !== id));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Tag name is required");
      return;
    }
    if (type === "DYNAMIC" && rows.length === 0) {
      setError("Smart View needs at least one filter rule");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const filters = type === "DYNAMIC" ? rowsToFilters(rows) : undefined;
      const body: any = { name: name.trim(), color, type };
      if (filters) body.filters = filters;

      const res = existing
        ? await api(`/tag/${existing._id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-workspace-id": workspaceId,
            },
            body: JSON.stringify(body),
          })
        : await api("/tag/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-workspace-id": workspaceId,
            },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || data.error || data.message || "Failed to save");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.04]">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" /> Back
        </button>
        <span className="text-[11px] text-muted-foreground">
          {existing ? "Edit tag" : "New tag"}
        </span>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2">
          <TypeCard
            active={type === "MANUAL"}
            onClick={() => setType("MANUAL")}
            icon={<TagIcon className="h-3.5 w-3.5" />}
            label="Manual"
            desc="Static label you assign"
          />
          <TypeCard
            active={type === "DYNAMIC"}
            onClick={() => setType("DYNAMIC")}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Smart View"
            desc="Auto-matched by rules"
          />
        </div>

        {/* Name */}
        <div className="grid gap-1.5">
          <Label htmlFor="tag-name" className="text-[11px] text-muted-foreground">
            Name
          </Label>
          <Input
            id="tag-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hot Leads in Vancouver"
            className="h-8 bg-white/[0.04] text-[13px]"
          />
        </div>

        {/* Color */}
        <div className="grid gap-1.5">
          <Label className="text-[11px] text-muted-foreground">Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition-all ${
                  color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Filter builder */}
        {type === "DYNAMIC" && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <FilterIcon className="h-3 w-3" />
                Match leads where
              </Label>
              <span className="text-[10px] text-muted-foreground/60">
                ALL conditions must match
              </span>
            </div>

            <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
              {rows.length === 0 && (
                <p className="px-2 py-3 text-center text-[11px] text-muted-foreground/60">
                  No rules yet. Add one below.
                </p>
              )}
              {rows.map((row) => (
                <FilterRowEditor
                  key={row.id}
                  row={row}
                  fields={fieldOptions}
                  onChange={(patch) => updateRow(row.id, patch)}
                  onRemove={() => removeRow(row.id)}
                />
              ))}
              <button
                onClick={addRow}
                disabled={fieldOptions.length === 0}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/[0.08] py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-white/[0.14] hover:bg-white/[0.03] hover:text-foreground disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
                Add condition
              </button>
            </div>

            {/* Live preview */}
            {rows.length > 0 && (
              <div className="rounded-md bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground/80">
                {JSON.stringify(rowsToFilters(rows))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
        <Button
          variant="ghost"
          onClick={onClose}
          className="h-7 px-3 text-xs text-muted-foreground"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-7 gap-1.5 px-3 text-xs"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {existing ? "Save changes" : "Create tag"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────
function TypeCard({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
        active
          ? "border-blue-500/40 bg-blue-500/[0.08]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
      }`}
    >
      <span
        className={`flex items-center gap-1.5 text-[12px] font-medium ${
          active ? "text-blue-300" : "text-foreground"
        }`}
      >
        {icon}
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground/70">{desc}</span>
    </button>
  );
}

function FilterRowEditor({
  row,
  fields,
  onChange,
  onRemove,
}: {
  row: FilterRow;
  fields: FilterSchemaField[];
  onChange: (patch: Partial<FilterRow>) => void;
  onRemove: () => void;
}) {
  const field = fields.find((f) => f.key === row.key);
  const fieldOptions = normalizeOptions(field?.options);

  function renderValue() {
    if (row.op === "exists") {
      return (
        <NativeSelect
          value={row.value || "true"}
          onChange={(v) => onChange({ value: v })}
          options={[
            { value: "true", label: "yes" },
            { value: "false", label: "no" },
          ]}
          className="flex-1"
        />
      );
    }
    if (fieldOptions && fieldOptions.length > 0) {
      if (row.op === "in") {
        return (
          <OptionMultiPicker
            value={row.value}
            options={fieldOptions}
            onChange={(v) => onChange({ value: v })}
            className="flex-1"
          />
        );
      }
      return (
        <OptionPicker
          value={row.value}
          options={fieldOptions}
          onChange={(v) => onChange({ value: v })}
          className="flex-1"
        />
      );
    }
    return (
      <Input
        value={row.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={row.op === "in" ? "comma,separated" : "value"}
        className="h-7 flex-1 bg-white/[0.04] text-[12px]"
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <NativeSelect
        value={row.key}
        onChange={(v) => onChange({ key: v, value: "" })}
        options={fields.map((f) => ({ value: f.key, label: f.label }))}
        className="flex-[1.4]"
      />
      <NativeSelect
        value={row.op}
        onChange={(v) => onChange({ op: v as Operator })}
        options={OPERATORS.map((o) => ({ value: o.value, label: o.label }))}
        className="w-[100px]"
      />
      {renderValue()}
      <button
        onClick={onRemove}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function OptionPicker({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <input
        value={open ? query : selected?.label || ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder="Search…"
        className="flex h-7 w-full items-center rounded-md border border-white/[0.06] bg-white/[0.04] px-2 text-[12px] text-foreground transition-colors hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
      />
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 min-w-full overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          {filtered.length === 0 && (
            <div className="px-3 py-1.5 text-[12px] text-muted-foreground/60">
              No matches
            </div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                setQuery("");
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06] ${
                value === opt.value ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="truncate text-left">{opt.label}</span>
              {value === opt.value && <Check className="h-3 w-3 shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionMultiPicker({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedValues = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const selectedLabels = selectedValues.map(
    (v) => options.find((o) => o.value === v)?.label || v,
  );
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function toggle(v: string) {
    const next = selectedValues.includes(v)
      ? selectedValues.filter((x) => x !== v)
      : [...selectedValues, v];
    onChange(next.join(","));
  }

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-full items-center justify-between gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-2 text-[12px] text-foreground transition-colors hover:bg-white/[0.06]"
      >
        <span className="truncate text-left">
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : "Select…"}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 min-w-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#1a1a1a] shadow-xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="block w-full border-b border-white/[0.06] bg-transparent px-3 py-1.5 text-[12px] text-foreground focus:outline-none"
          />
          <div className="max-h-48 overflow-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-1.5 text-[12px] text-muted-foreground/60">
                No matches
              </div>
            )}
            {filtered.map((opt) => {
              const checked = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06] ${
                    checked ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span className="truncate text-left">{opt.label}</span>
                  {checked && <Check className="h-3 w-3 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-full items-center justify-between gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-2 text-[12px] text-foreground transition-colors hover:bg-white/[0.06]"
      >
        <span className="truncate">{selected?.label || "—"}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 min-w-full overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06] ${
                value === opt.value ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="truncate text-left">{opt.label}</span>
              {value === opt.value && <Check className="h-3 w-3 shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function summarizeFilters(filters: Record<string, any>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    const label = k.replace(/^extra_fields\./, "");
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const op = Object.keys(v)[0] || "";
      parts.push(`${label} ${op.replace("$", "")} ${JSON.stringify(v[op])}`);
    } else {
      parts.push(`${label}: ${v}`);
    }
  }
  return parts.join(" · ");
}
