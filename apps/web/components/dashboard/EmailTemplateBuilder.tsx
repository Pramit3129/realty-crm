"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Type,
  Image as ImageIcon,
  AlignLeft,
  Minus,
  Square,
  ChevronDown,
  ChevronUp,
  Save,
  LayoutTemplate,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATE_NAME = "Custom Template";

export interface EmailBlock {
  id: string;
  type: "heading" | "text" | "image" | "button" | "divider" | "spacer";
  props: Record<string, any>;
}

export interface EmailTemplateData {
  _id?: string;
  name: string;
  isPrebuilt?: boolean;
  backgroundColor: string;
  blocks: EmailBlock[];
}

interface Props {
  workspaceId: string;
  /** Initial template to load into the builder (editing or using a template) */
  initialTemplate?: EmailTemplateData | null;
  /** Called when the user clicks "Use Template" — passes rendered HTML + subject hint */
  onUse?: (html: string, template: EmailTemplateData) => void;
  /** Called to close/go back */
  onClose: () => void;
}

// ─── Block Palette Config ─────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { type: "heading", label: "Heading", icon: Type, description: "Title or headline" },
  { type: "text", label: "Text", icon: AlignLeft, description: "Paragraph of text" },
  { type: "image", label: "Image", icon: ImageIcon, description: "Image from URL" },
  { type: "button", label: "Button", icon: Square, description: "Call-to-action button" },
  { type: "divider", label: "Divider", icon: Minus, description: "Horizontal line" },
  { type: "spacer", label: "Spacer", icon: ChevronDown, description: "Blank vertical space" },
] as const;

function defaultProps(type: EmailBlock["type"]): Record<string, any> {
  switch (type) {
    case "heading":
      return { text: "Your Heading Here", level: 1, align: "center", color: "#1a1a2e" };
    case "text":
      return { text: "Write your paragraph text here. You can use {{name}} for personalization.", align: "left", color: "#444444" };
    case "image":
      return { url: "", alt: "Image", align: "center" };
    case "button":
      return { text: "Click Here", url: "#", bgColor: "#208ef0", textColor: "#ffffff", align: "center" };
    case "divider":
      return { color: "#e0e0e0" };
    case "spacer":
      return { height: 24 };
    default:
      return {};
  }
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── HTML Generator ───────────────────────────────────────────────────────────

export function blocksToHtml(blocks: EmailBlock[], backgroundColor = "#ffffff"): string {
  const blockHtml = blocks
    .map((block) => {
      const p = block.props;
      switch (block.type) {
        case "heading": {
          const tag = `h${Math.min(Math.max(p.level ?? 1, 1), 3)}`;
          return `<${tag} style="text-align:${p.align ?? "left"};color:${p.color ?? "#000000"};margin:0 0 12px 0;font-family:Segoe UI,sans-serif;">${p.text ?? ""}</${tag}>`;
        }
        case "text":
          return `<p style="text-align:${p.align ?? "left"};color:${p.color ?? "#333333"};margin:0 0 12px 0;line-height:1.6;font-family:Segoe UI,sans-serif;white-space:pre-wrap;">${p.text ?? ""}</p>`;
        case "image":
          if (!p.url) return "";
          return `<div style="text-align:${p.align ?? "center"};margin:0 0 12px 0;"><img src="${p.url}" alt="${p.alt ?? ""}" style="max-width:100%;height:auto;display:inline-block;border-radius:4px;" /></div>`;
        case "button":
          return `<div style="text-align:${p.align ?? "center"};margin:0 0 12px 0;"><a href="${p.url ?? "#"}" style="display:inline-block;padding:12px 28px;background-color:${p.bgColor ?? "#208ef0"};color:${p.textColor ?? "#ffffff"};border-radius:6px;text-decoration:none;font-weight:600;font-family:Segoe UI,sans-serif;">${p.text ?? "Click Here"}</a></div>`;
        case "divider":
          return `<hr style="border:none;border-top:1px solid ${p.color ?? "#e0e0e0"};margin:16px 0;" />`;
        case "spacer":
          return `<div style="height:${p.height ?? 24}px;"></div>`;
        default:
          return "";
      }
    })
    .join("\n");

  return `<div style="max-width:600px;margin:0 auto;background-color:${backgroundColor};padding:32px 24px;font-family:Segoe UI,sans-serif;">\n${blockHtml}\n</div>`;
}

// ─── Block Preview (inside canvas) ───────────────────────────────────────────

function BlockPreview({ block, onClick, isSelected }: { block: EmailBlock; onClick: () => void; isSelected: boolean }) {
  const p = block.props;
  let content: React.ReactNode = null;

  switch (block.type) {
    case "heading": {
      const sizes = { 1: "text-2xl font-bold", 2: "text-xl font-semibold", 3: "text-lg font-medium" };
      const sz = sizes[(p.level as 1 | 2 | 3) ?? 1] ?? sizes[1];
      content = (
        <p className={`${sz} truncate`} style={{ color: p.color, textAlign: p.align }}>
          {p.text || "Heading"}
        </p>
      );
      break;
    }
    case "text":
      content = (
        <p className="text-sm leading-relaxed line-clamp-2 whitespace-pre-wrap" style={{ color: p.color, textAlign: p.align }}>
          {p.text || "Text block"}
        </p>
      );
      break;
    case "image":
      content = p.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.url} alt={p.alt ?? "image"} className="max-h-24 rounded object-cover mx-auto" />
      ) : (
        <div className="flex h-16 items-center justify-center rounded border border-dashed border-border bg-muted/50 text-xs text-muted-foreground">
          <ImageIcon className="mr-1.5 h-4 w-4" /> No image URL set
        </div>
      );
      break;
    case "button":
      content = (
        <div style={{ textAlign: p.align }}>
          <span
            className="inline-block rounded px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: p.bgColor, color: p.textColor }}
          >
            {p.text || "Button"}
          </span>
        </div>
      );
      break;
    case "divider":
      content = <hr style={{ borderTop: `1px solid ${p.color ?? "#e0e0e0"}` }} />;
      break;
    case "spacer":
      content = (
        <div
          className="flex items-center justify-center text-[10px] text-muted-foreground/50"
          style={{ height: `${Math.min(p.height ?? 24, 80)}px` }}
        >
          {p.height}px spacer
        </div>
      );
      break;
  }

  return (
    <div
      className={`group relative cursor-pointer rounded-lg border px-4 py-3 transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
          : "border-border hover:border-muted-foreground/30 bg-card"
      }`}
      onClick={onClick}
    >
      {content}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
    </div>
  );
}

// ─── Properties Panel ─────────────────────────────────────────────────────────

function PropertiesPanel({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: EmailBlock;
  onChange: (props: Record<string, any>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const p = block.props;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api("/upload/image", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          onChange({ ...p, url: data.url });
        } else {
          setUploadError("Upload failed. Please try again.");
        }
      } catch {
        setUploadError("Network error during upload.");
      } finally {
        setUploading(false);
      }
    },
    [p, onChange]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Move / Delete */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {block.type} block
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={isFirst}
            onClick={onMoveUp}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            title="Move Up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            disabled={isLast}
            onClick={onMoveDown}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            title="Move Down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
            title="Delete Block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Fields */}
      {(block.type === "heading" || block.type === "text") && (
        <>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Content</label>
            <textarea
              value={p.text ?? ""}
              onChange={(e) => onChange({ ...p, text: e.target.value })}
              rows={block.type === "text" ? 5 : 2}
              className="w-full rounded-md border border-border bg-muted/50 p-2 text-[12px] text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Alignment</label>
            <div className="flex gap-2">
              {["left", "center", "right"].map((a) => (
                <button
                  key={a}
                  onClick={() => onChange({ ...p, align: a })}
                  className={`flex-1 rounded border py-1 text-[11px] capitalize transition-colors ${
                    p.align === a
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={p.color ?? "#333333"}
                onChange={(e) => onChange({ ...p, color: e.target.value })}
                className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
              <Input
                value={p.color ?? "#333333"}
                onChange={(e) => onChange({ ...p, color: e.target.value })}
                className="h-7 flex-1 border-border bg-muted/50 text-[12px]"
              />
            </div>
          </div>
          {block.type === "heading" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Size</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => onChange({ ...p, level: lvl })}
                    className={`flex-1 rounded border py-1 text-[11px] transition-colors ${
                      p.level === lvl
                        ? "border-blue-500 bg-blue-500/10 text-blue-500"
                        : "border-border text-muted-foreground hover:border-muted-foreground/50"
                    }`}
                  >
                    H{lvl}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {block.type === "image" && (
        <>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Image URL</label>
            <Input
              value={p.url ?? ""}
              onChange={(e) => onChange({ ...p, url: e.target.value })}
              placeholder="https://..."
              className="h-8 border-border bg-muted/50 text-[12px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Upload Image</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 py-3 text-[12px] text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground">
              <ImageIcon className="h-4 w-4" />
              {uploading ? "Uploading..." : "Choose file"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </label>
            {uploadError && <p className="mt-1 text-[10px] text-red-400">{uploadError}</p>}
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Alt Text</label>
            <Input
              value={p.alt ?? ""}
              onChange={(e) => onChange({ ...p, alt: e.target.value })}
              className="h-8 border-border bg-muted/50 text-[12px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Alignment</label>
            <div className="flex gap-2">
              {["left", "center", "right"].map((a) => (
                <button
                  key={a}
                  onClick={() => onChange({ ...p, align: a })}
                  className={`flex-1 rounded border py-1 text-[11px] capitalize transition-colors ${
                    p.align === a
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {block.type === "button" && (
        <>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Button Text</label>
            <Input
              value={p.text ?? ""}
              onChange={(e) => onChange({ ...p, text: e.target.value })}
              className="h-8 border-border bg-muted/50 text-[12px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Link URL</label>
            <Input
              value={p.url ?? ""}
              onChange={(e) => onChange({ ...p, url: e.target.value })}
              placeholder="https://..."
              className="h-8 border-border bg-muted/50 text-[12px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">BG Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={p.bgColor ?? "#208ef0"}
                  onChange={(e) => onChange({ ...p, bgColor: e.target.value })}
                  className="h-7 w-8 cursor-pointer rounded border border-border"
                />
                <Input
                  value={p.bgColor ?? "#208ef0"}
                  onChange={(e) => onChange({ ...p, bgColor: e.target.value })}
                  className="h-7 flex-1 border-border bg-muted/50 text-[11px]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Text Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={p.textColor ?? "#ffffff"}
                  onChange={(e) => onChange({ ...p, textColor: e.target.value })}
                  className="h-7 w-8 cursor-pointer rounded border border-border"
                />
                <Input
                  value={p.textColor ?? "#ffffff"}
                  onChange={(e) => onChange({ ...p, textColor: e.target.value })}
                  className="h-7 flex-1 border-border bg-muted/50 text-[11px]"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Alignment</label>
            <div className="flex gap-2">
              {["left", "center", "right"].map((a) => (
                <button
                  key={a}
                  onClick={() => onChange({ ...p, align: a })}
                  className={`flex-1 rounded border py-1 text-[11px] capitalize transition-colors ${
                    p.align === a
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {block.type === "divider" && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={p.color ?? "#e0e0e0"}
              onChange={(e) => onChange({ ...p, color: e.target.value })}
              className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
            />
            <Input
              value={p.color ?? "#e0e0e0"}
              onChange={(e) => onChange({ ...p, color: e.target.value })}
              className="h-7 flex-1 border-border bg-muted/50 text-[12px]"
            />
          </div>
        </div>
      )}

      {block.type === "spacer" && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Height (px)</label>
          <Input
            type="number"
            min={8}
            max={200}
            value={p.height ?? 24}
            onChange={(e) => onChange({ ...p, height: parseInt(e.target.value) || 24 })}
            className="h-8 border-border bg-muted/50 text-[12px]"
          />
        </div>
      )}
    </div>
  );
}

// ─── Template Gallery Modal ────────────────────────────────────────────────────

function TemplateGalleryModal({
  workspaceId,
  onSelect,
  onClose,
}: {
  workspaceId: string;
  onSelect: (template: EmailTemplateData) => void;
  onClose: () => void;
}) {
  const [prebuilt, setPrebuilt] = useState<EmailTemplateData[]>([]);
  const [saved, setSaved] = useState<EmailTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [pb, sv] = await Promise.all([
          api("/emailTemplate/prebuilt"),
          api(`/emailTemplate/workspace/${workspaceId}`),
        ]);
        if (pb.ok) {
          setPrebuilt((await pb.json()).data ?? []);
        }
        if (sv.ok) {
          setSaved((await sv.json()).data ?? []);
        }
      } catch {
        setLoadError("Failed to load templates. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    setDeleting(id);
    try {
      const res = await api(`/emailTemplate/${id}`, { method: "DELETE" });
      if (res.ok) setSaved((s) => s.filter((t) => t._id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const renderCard = (t: EmailTemplateData) => (
    <div key={t._id} className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      {/* Mini preview */}
      <div className="relative h-32 overflow-hidden bg-muted/30 p-3">
        <div className="pointer-events-none scale-[0.42] origin-top-left w-[600px]">
          <div
            dangerouslySetInnerHTML={{ __html: blocksToHtml(t.blocks, t.backgroundColor) }}
          />
        </div>
        {t.isPrebuilt && (
          <span className="absolute right-2 top-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
            Prebuilt
          </span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
        <p className="text-[12px] font-semibold text-foreground truncate max-w-[120px]">{t.name}</p>
        <div className="flex items-center gap-1.5">
          {!t.isPrebuilt && (
            <button
              onClick={() => handleDelete(t._id!)}
              disabled={deleting === t._id}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <Button
            size="sm"
            onClick={() => onSelect(t)}
            className="h-6 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            Use
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-foreground">Template Gallery</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading templates…
            </div>
          ) : loadError ? (
            <div className="flex h-32 items-center justify-center text-sm text-red-400">
              {loadError}
            </div>
          ) : (
            <>
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pre-built Templates
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {prebuilt.map(renderCard)}
                </div>
              </div>
              {saved.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Saved Templates ({saved.length}/3)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {saved.map(renderCard)}
                  </div>
                </div>
              )}
              {saved.length === 0 && (
                <p className="text-center text-[12px] text-muted-foreground">
                  No saved templates yet. Build one and save it!
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Save Template Modal ──────────────────────────────────────────────────────

function SaveTemplateModal({
  workspaceId,
  blocks,
  backgroundColor,
  existingId,
  existingName,
  onSaved,
  onClose,
}: {
  workspaceId: string;
  blocks: EmailBlock[];
  backgroundColor: string;
  existingId?: string;
  existingName?: string;
  onSaved: (template: EmailTemplateData) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(existingName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let res: Response;
      if (existingId) {
        res = await api(`/emailTemplate/${existingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, blocks, backgroundColor }),
        });
      } else {
        res = await api("/emailTemplate/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, workspaceId, blocks, backgroundColor }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to save");
        return;
      }
      onSaved(data.data);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Save as Template</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Template Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Welcome Template"
            className="h-8 border-border bg-muted/50 text-[12px]"
            autoFocus
          />
          {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1 text-xs h-8">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white border-0">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main EmailTemplateBuilder Component ──────────────────────────────────────

export default function EmailTemplateBuilder({ workspaceId, initialTemplate, onUse, onClose }: Props) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialTemplate?.blocks ?? []);
  const [backgroundColor, setBackgroundColor] = useState(initialTemplate?.backgroundColor ?? "#ffffff");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [savedTemplateId, setSavedTemplateId] = useState<string | undefined>(
    initialTemplate && !initialTemplate.isPrebuilt ? initialTemplate._id : undefined
  );
  const [savedTemplateName, setSavedTemplateName] = useState<string | undefined>(
    initialTemplate && !initialTemplate.isPrebuilt ? initialTemplate.name : undefined
  );

  const draggedBlock = useRef<string | null>(null);
  const dragOverBlock = useRef<string | null>(null);
  const draggedNewType = useRef<string | null>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const selectedIndex = blocks.findIndex((b) => b.id === selectedId);

  const addBlock = useCallback((type: EmailBlock["type"]) => {
    const block: EmailBlock = { id: generateId(), type, props: defaultProps(type) };
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }, []);

  const updateBlockProps = useCallback((id: string, props: Record<string, any>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props } : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId(null);
  }, []);

  const moveBlock = useCallback((id: string, dir: "up" | "down") => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = dir === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  // Drag-and-drop handlers for reordering blocks in canvas
  const onDragStart = (e: React.DragEvent, id: string) => {
    draggedBlock.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverBlock.current = id;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // New block from palette
    if (draggedNewType.current) {
      const type = draggedNewType.current as EmailBlock["type"];
      draggedNewType.current = null;
      addBlock(type);
      return;
    }
    // Reorder existing block
    if (!draggedBlock.current || !dragOverBlock.current || draggedBlock.current === dragOverBlock.current) return;
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === draggedBlock.current);
      const to = prev.findIndex((b) => b.id === dragOverBlock.current);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    draggedBlock.current = null;
    dragOverBlock.current = null;
  };

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedNewType.current) {
      const type = draggedNewType.current as EmailBlock["type"];
      draggedNewType.current = null;
      addBlock(type);
    }
  };

  const handleUse = () => {
    const html = blocksToHtml(blocks, backgroundColor);
    onUse?.(html, { _id: savedTemplateId, name: savedTemplateName ?? DEFAULT_TEMPLATE_NAME, backgroundColor, blocks });
  };

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-background animate-in slide-in-from-bottom-4 duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-4 w-px bg-border" />
          <LayoutTemplate className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-foreground">Email Template Builder</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGallery(true)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Templates
          </button>
          <button
            onClick={() => setShowSave(true)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Save className="h-3.5 w-3.5" />
            Save Template
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <label>Background:</label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-border"
            />
          </div>
          {onUse && (
            <Button
              size="sm"
              onClick={handleUse}
              className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md"
            >
              Use Template
            </Button>
          )}
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Block Palette */}
        <div className="w-[200px] shrink-0 border-r border-border bg-card overflow-y-auto p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Drag Blocks
          </p>
          <div className="flex flex-col gap-1.5">
            {BLOCK_TYPES.map(({ type, label, icon: Icon, description }) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => {
                  draggedNewType.current = type;
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => addBlock(type as EmailBlock["type"])}
                className="flex cursor-grab items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:border-blue-500/50 hover:bg-blue-500/5 active:cursor-grabbing"
                title={description}
              >
                <Icon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="text-[12px] font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: "oklch(var(--muted)/0.3)" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onCanvasDrop}
        >
          <div className="mx-auto my-6 w-full max-w-[640px]">
            <div
              className="min-h-[400px] rounded-xl border border-border shadow-lg overflow-hidden"
              style={{ backgroundColor }}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="px-8 py-8 space-y-3">
                {blocks.length === 0 && (
                  <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-muted-foreground">
                    <Plus className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Drag blocks here or click blocks from the left panel</p>
                  </div>
                )}
                {blocks.map((block, i) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, block.id)}
                    onDragOver={(e) => onDragOver(e, block.id)}
                  >
                    <BlockPreview
                      block={block}
                      isSelected={block.id === selectedId}
                      onClick={() => setSelectedId(block.id === selectedId ? null : block.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Properties */}
        <div className="w-[240px] shrink-0 border-l border-border bg-card overflow-y-auto p-4">
          {selectedBlock ? (
            <PropertiesPanel
              block={selectedBlock}
              onChange={(props) => updateBlockProps(selectedBlock.id, props)}
              onDelete={() => deleteBlock(selectedBlock.id)}
              onMoveUp={() => moveBlock(selectedBlock.id, "up")}
              onMoveDown={() => moveBlock(selectedBlock.id, "down")}
              isFirst={selectedIndex === 0}
              isLast={selectedIndex === blocks.length - 1}
            />
          ) : (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <p className="text-[12px] text-muted-foreground">
                Click a block in the canvas to edit its properties
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showGallery && (
        <TemplateGalleryModal
          workspaceId={workspaceId}
          onSelect={(t) => {
            setBlocks(t.blocks);
            setBackgroundColor(t.backgroundColor ?? "#ffffff");
            setSavedTemplateId(t.isPrebuilt ? undefined : t._id);
            setSavedTemplateName(t.isPrebuilt ? undefined : t.name);
            setSelectedId(null);
            setShowGallery(false);
          }}
          onClose={() => setShowGallery(false)}
        />
      )}

      {showSave && (
        <SaveTemplateModal
          workspaceId={workspaceId}
          blocks={blocks}
          backgroundColor={backgroundColor}
          existingId={savedTemplateId}
          existingName={savedTemplateName}
          onSaved={(t) => {
            setSavedTemplateId(t._id);
            setSavedTemplateName(t.name);
            setShowSave(false);
          }}
          onClose={() => setShowSave(false)}
        />
      )}
    </div>
  );
}
