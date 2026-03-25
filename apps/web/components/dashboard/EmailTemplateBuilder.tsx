"use client";

import { useState, useCallback } from "react";
import {
  Type,
  AlignLeft,
  Image as ImageIcon,
  MousePointer,
  Minus,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  X,
  Mail,
  Eye,
  Code,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = "heading" | "text" | "image" | "button" | "divider" | "spacer";
type Alignment = "left" | "center" | "right";

interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  align: Alignment;
  href: string;
  src: string;
  alt: string;
  bgColor: string;
  textColor: string;
  height: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return crypto.randomUUID();
}

function defaultBlock(type: BlockType): EmailBlock {
  return {
    id: generateId(),
    type,
    content:
      type === "heading"
        ? "Your Heading Here"
        : type === "text"
          ? "Write your email content here. You can use {{name}} for personalization."
          : type === "button"
            ? "Click Here"
            : "",
    align: type === "button" ? "center" : "left",
    href: "",
    src: "",
    alt: "",
    bgColor: type === "button" ? "#2563eb" : "#ffffff",
    textColor: type === "button" ? "#ffffff" : "#000000",
    height: 20,
  };
}

// ─── Block Config ─────────────────────────────────────────────────────────────

const BLOCK_CONFIG: {
  type: BlockType;
  label: string;
  description: string;
  iconColor: string;
  bgColor: string;
}[] = [
  {
    type: "heading",
    label: "Heading",
    description: "Large title text",
    iconColor: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    type: "text",
    label: "Text",
    description: "Paragraph content",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    type: "image",
    label: "Image",
    description: "Photo or banner",
    iconColor: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    type: "button",
    label: "Button",
    description: "Call-to-action link",
    iconColor: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    type: "divider",
    label: "Divider",
    description: "Horizontal rule",
    iconColor: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Empty vertical space",
    iconColor: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

function blockConfig(type: BlockType) {
  return BLOCK_CONFIG.find((c) => c.type === type)!;
}

// ─── Block Icon ───────────────────────────────────────────────────────────────

function BlockIcon({
  type,
  className,
}: {
  type: BlockType;
  className?: string;
}) {
  switch (type) {
    case "heading":
      return <Type className={className} />;
    case "text":
      return <AlignLeft className={className} />;
    case "image":
      return <ImageIcon className={className} />;
    case "button":
      return <MousePointer className={className} />;
    case "divider":
      return <Minus className={className} />;
    case "spacer":
      return <Maximize2 className={className} />;
  }
}

// ─── Block Preview ────────────────────────────────────────────────────────────

function BlockPreview({ block }: { block: EmailBlock }) {
  const alignClass =
    block.align === "center"
      ? "text-center"
      : block.align === "right"
        ? "text-right"
        : "text-left";

  switch (block.type) {
    case "heading":
      return (
        <div className={`px-6 py-4 ${alignClass}`}>
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            {block.content || "Your Heading Here"}
          </h2>
        </div>
      );

    case "text":
      return (
        <div className={`px-6 py-3 ${alignClass}`}>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {block.content || "Your text here..."}
          </p>
        </div>
      );

    case "image":
      return (
        <div className={`px-6 py-3 ${alignClass}`}>
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.src}
              alt={block.alt || ""}
              className="max-w-full rounded-md"
            />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/50">
              <div className="text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter an image URL in properties
                </p>
              </div>
            </div>
          )}
        </div>
      );

    case "button":
      return (
        <div className={`px-6 py-4 ${alignClass}`}>
          <a
            href={block.href || "#"}
            className="inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: block.bgColor, color: block.textColor }}
            onClick={(e) => e.preventDefault()}
          >
            {block.content || "Click Here"}
          </a>
        </div>
      );

    case "divider":
      return (
        <div className="px-6 py-2">
          <hr className="border-border" />
        </div>
      );

    case "spacer":
      return <div style={{ height: block.height || 20 }} />;
  }
}

// ─── Properties Panel ─────────────────────────────────────────────────────────

function PropertiesPanel({
  block,
  onChange,
}: {
  block: EmailBlock;
  onChange: (updated: EmailBlock) => void;
}) {
  function update(patch: Partial<EmailBlock>) {
    onChange({ ...block, ...patch });
  }

  const fieldClass = "h-8 border-border bg-muted/50 text-[13px]";
  const labelClass = "mb-1.5 block text-[12px] font-medium text-muted-foreground";
  const groupClass = "space-y-3";

  return (
    <div className="flex flex-col gap-4">
      {/* Content / Label */}
      {(block.type === "heading" ||
        block.type === "text" ||
        block.type === "button") && (
        <div className={groupClass}>
          <div>
            <label className={labelClass}>
              {block.type === "button" ? "Button Label" : "Content"}
            </label>
            {block.type === "text" ? (
              <textarea
                value={block.content}
                onChange={(e) => update({ content: e.target.value })}
                rows={4}
                className="w-full rounded-md border border-border bg-muted/50 p-2.5 text-[13px] text-foreground placeholder-muted-foreground/40 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            ) : (
              <Input
                value={block.content}
                onChange={(e) => update({ content: e.target.value })}
                className={fieldClass}
              />
            )}
          </div>
        </div>
      )}

      {/* Image fields */}
      {block.type === "image" && (
        <div className={groupClass}>
          <div>
            <label className={labelClass}>Image URL</label>
            <Input
              value={block.src}
              onChange={(e) => update({ src: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Alt Text</label>
            <Input
              value={block.alt}
              onChange={(e) => update({ alt: e.target.value })}
              placeholder="Image description"
              className={fieldClass}
            />
          </div>
        </div>
      )}

      {/* Alignment */}
      {(block.type === "heading" ||
        block.type === "text" ||
        block.type === "image" ||
        block.type === "button") && (
        <div>
          <label className={labelClass}>Alignment</label>
          <div className="flex gap-1 rounded-md border border-border p-1 bg-muted/30">
            {(["left", "center", "right"] as Alignment[]).map((a) => (
              <button
                key={a}
                onClick={() => update({ align: a })}
                className={cn(
                  "flex-1 rounded py-1 text-[11px] font-medium transition-colors capitalize",
                  block.align === a
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Button-specific: link + colours */}
      {block.type === "button" && (
        <>
          <div>
            <label className={labelClass}>Link URL</label>
            <Input
              value={block.href}
              onChange={(e) => update({ href: e.target.value })}
              placeholder="https://example.com"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={block.bgColor}
                onChange={(e) => update({ bgColor: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <Input
                value={block.bgColor}
                onChange={(e) => update({ bgColor: e.target.value })}
                className={`${fieldClass} flex-1`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={block.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <Input
                value={block.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className={`${fieldClass} flex-1`}
              />
            </div>
          </div>
        </>
      )}

      {/* Spacer height */}
      {block.type === "spacer" && (
        <div>
          <label className={labelClass}>Height (px)</label>
          <Input
            type="number"
            min={4}
            max={200}
            value={block.height}
            onChange={(e) =>
              update({ height: parseInt(e.target.value) || 20 })
            }
            className={fieldClass}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface EmailTemplateBuilderProps {
  onSave?: (subject: string, blocks: EmailBlock[]) => void;
  onClose?: () => void;
  initialSubject?: string;
  initialBlocks?: EmailBlock[];
}

export default function EmailTemplateBuilder({
  onSave,
  onClose,
  initialSubject = "",
  initialBlocks = [],
}: EmailTemplateBuilderProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [blocks, setBlocks] = useState<EmailBlock[]>(() =>
    initialBlocks.length > 0
      ? initialBlocks
      : [defaultBlock("heading"), defaultBlock("text"), defaultBlock("button")],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => blocks[0]?.id ?? null,
  );
  const [showHtml, setShowHtml] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const selectedIndex = blocks.findIndex((b) => b.id === selectedId);

  // ── Block operations ────────────────────────────────────────────────────────

  const addBlock = useCallback((type: BlockType) => {
    const block = defaultBlock(type);
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }, []);

  const updateBlock = useCallback((updated: EmailBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  const deleteBlock = useCallback(
    (id: string) => {
      setBlocks((prev) => {
        const next = prev.filter((b) => b.id !== id);
        if (selectedId === id) {
          setSelectedId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [selectedId],
  );

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  /** Navigate selection up or down without moving the block */
  const navigateTo = useCallback(
    (direction: "up" | "down") => {
      const idx = blocks.findIndex((b) => b.id === selectedId);
      if (idx === -1) return;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx >= 0 && nextIdx < blocks.length) {
        setSelectedId(blocks[nextIdx].id);
      }
    },
    [blocks, selectedId],
  );

  // ── HTML Export ─────────────────────────────────────────────────────────────

  const generateHtml = useCallback(() => {
    const blocksHtml = blocks
      .map((block) => {
        const alignStyle = `text-align:${block.align};`;
        switch (block.type) {
          case "heading":
            return `<h2 style="font-size:24px;font-weight:700;margin:0;padding:16px 24px;${alignStyle}color:#111827;">${block.content}</h2>`;
          case "text":
            return `<p style="font-size:14px;line-height:1.6;margin:0;padding:12px 24px;${alignStyle}color:#374151;">${block.content.replace(/\n/g, "<br>")}</p>`;
          case "image":
            return block.src
              ? `<div style="padding:12px 24px;${alignStyle}"><img src="${block.src}" alt="${block.alt || ""}" style="max-width:100%;border-radius:6px;" /></div>`
              : "";
          case "button":
            return `<div style="padding:16px 24px;${alignStyle}"><a href="${block.href || "#"}" style="display:inline-block;padding:10px 24px;background:${block.bgColor};color:${block.textColor};text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">${block.content}</a></div>`;
          case "divider":
            return `<hr style="margin:8px 24px;border:none;border-top:1px solid #e5e7eb;" />`;
          case "spacer":
            return `<div style="height:${block.height || 20}px;"></div>`;
        }
      })
      .join("\n");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
${blocksHtml}
    <div style="padding:24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center;">
      This email was sent via Realty CRM
    </div>
  </div>
</body>
</html>`;
  }, [blocks]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background animate-in slide-in-from-right-8 duration-200">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Mail className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Email Template Builder
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line..."
              className="bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Top-down element navigation in the header */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
            <button
              onClick={() => navigateTo("up")}
              disabled={selectedIndex <= 0}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              title="Select previous element"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[40px] text-center text-[11px] font-medium text-muted-foreground">
              {selectedIndex >= 0
                ? `${selectedIndex + 1} / ${blocks.length}`
                : "–"}
            </span>
            <button
              onClick={() => navigateTo("down")}
              disabled={
                selectedIndex < 0 || selectedIndex >= blocks.length - 1
              }
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              title="Select next element"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHtml((v) => !v)}
            className="h-8 gap-1.5 text-xs border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {showHtml ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <Code className="h-3.5 w-3.5" />
            )}
            {showHtml ? "Preview" : "HTML"}
          </Button>

          {onSave && (
            <Button
              size="sm"
              onClick={() => onSave(subject, blocks)}
              className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm"
            >
              Save Template
            </Button>
          )}

          {onClose && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              <button
                onClick={onClose}
                className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left – Block Palette */}
        <div className="flex w-52 flex-shrink-0 flex-col border-r border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Add Block
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {BLOCK_CONFIG.map(({ type, label, description, iconColor, bgColor }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                    bgColor,
                  )}
                >
                  <BlockIcon type={type} className={cn("h-4 w-4", iconColor)} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    {label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Centre – Canvas */}
        <div className="flex flex-1 flex-col overflow-hidden bg-muted/20">
          {showHtml ? (
            <div className="flex-1 overflow-auto p-6">
              <pre className="rounded-xl border border-border bg-card p-4 text-[12px] text-foreground font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
                {generateHtml()}
              </pre>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto my-8 w-full max-w-[600px]">
                {/* Email container mock */}
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  {/* Fake browser bar */}
                  <div className="border-b border-border bg-muted/30 px-4 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
                    </div>
                    <div className="flex-1 mx-2 rounded-md bg-muted/60 px-3 py-0.5 text-[11px] text-muted-foreground truncate">
                      {subject || "Subject line preview..."}
                    </div>
                  </div>

                  {/* Blocks list */}
                  <div className="divide-y divide-border/50">
                    {blocks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No blocks yet
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Add blocks from the left panel
                        </p>
                      </div>
                    ) : (
                      blocks.map((block, index) => {
                        const isSelected = block.id === selectedId;
                        const cfg = blockConfig(block.type);
                        return (
                          <div
                            key={block.id}
                            onClick={() => setSelectedId(block.id)}
                            className={cn(
                              "group relative cursor-pointer transition-all",
                              isSelected
                                ? "ring-2 ring-inset ring-blue-500/60 bg-blue-500/5"
                                : "hover:bg-muted/20",
                            )}
                          >
                            <BlockPreview block={block} />

                            {/* Per-block controls (move up/down + delete) */}
                            <div
                              className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 transition-opacity",
                                isSelected
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100",
                              )}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveBlock(block.id, "up");
                                }}
                                disabled={index === 0}
                                className="flex h-6 w-6 items-center justify-center rounded bg-card border border-border text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveBlock(block.id, "down");
                                }}
                                disabled={index === blocks.length - 1}
                                className="flex h-6 w-6 items-center justify-center rounded bg-card border border-border text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBlock(block.id);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded bg-card border border-border text-muted-foreground shadow-sm transition-colors hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                title="Delete block"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Selection badge */}
                            {isSelected && (
                              <div
                                className={cn(
                                  "absolute left-2 top-1.5 flex items-center gap-1 rounded-full px-2 py-0.5",
                                  cfg.bgColor,
                                )}
                              >
                                <BlockIcon
                                  type={block.type}
                                  className={cn("h-2.5 w-2.5", cfg.iconColor)}
                                />
                                <span
                                  className={cn(
                                    "text-[9px] font-semibold uppercase tracking-wider",
                                    cfg.iconColor,
                                  )}
                                >
                                  {cfg.label}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Quick-add hint */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => addBlock("text")}
                    className="flex items-center gap-2 rounded-full border border-dashed border-border bg-card px-4 py-2 text-[12px] text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Text Block
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right – Properties Panel */}
        <div className="flex w-60 flex-shrink-0 flex-col border-l border-border bg-card">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Properties
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedBlock ? (
              <>
                <div
                  className={cn(
                    "mb-4 flex items-center gap-2 rounded-lg p-2.5",
                    blockConfig(selectedBlock.type).bgColor,
                  )}
                >
                  <BlockIcon
                    type={selectedBlock.type}
                    className={cn(
                      "h-4 w-4",
                      blockConfig(selectedBlock.type).iconColor,
                    )}
                  />
                  <span
                    className={cn(
                      "text-[12px] font-semibold",
                      blockConfig(selectedBlock.type).iconColor,
                    )}
                  >
                    {blockConfig(selectedBlock.type).label} Block
                  </span>
                </div>
                <PropertiesPanel block={selectedBlock} onChange={updateBlock} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Select a block to edit its properties
                </p>
              </div>
            )}
          </div>

          {/* Bottom navigation strip */}
          {blocks.length > 0 && (
            <div className="border-t border-border p-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Navigate Elements
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo("up")}
                  disabled={selectedIndex <= 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-muted/30 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="h-3 w-3" />
                  Prev
                </button>
                <span className="min-w-[36px] text-center text-[11px] font-medium text-muted-foreground">
                  {selectedIndex >= 0
                    ? `${selectedIndex + 1}/${blocks.length}`
                    : "–"}
                </span>
                <button
                  onClick={() => navigateTo("down")}
                  disabled={
                    selectedIndex < 0 || selectedIndex >= blocks.length - 1
                  }
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-muted/30 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
