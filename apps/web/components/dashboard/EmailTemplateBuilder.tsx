"use client";

import { useState } from "react";
import { X, LayoutTemplate, CheckCircle2, Code2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Types ---
export interface EmailTemplateData {
  id: string;
  name: string;
  description: string;
  html: string;
}

interface EmailTemplateBuilderProps {
  workspaceId: string;
  onUse: (html: string, template: EmailTemplateData) => void;
  onClose: () => void;
}

// --- Predefined Templates ---
const TEMPLATES: EmailTemplateData[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    description: "A warm welcome email for new leads",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
  <h1 style="color:#1a1a1a;font-size:24px;margin-bottom:8px;">Welcome, {{name}}!</h1>
  <p style="color:#555;font-size:15px;line-height:1.6;">Thank you for your interest. We're excited to have you on board and look forward to helping you find your perfect property.</p>
  <p style="color:#555;font-size:15px;line-height:1.6;">Our team is here to answer any questions you may have. Feel free to reach out at any time.</p>
  <a href="#" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Get Started</a>
  <p style="color:#999;font-size:12px;margin-top:32px;">If you have any questions, just reply to this email — we're always happy to help.</p>
</div>`,
  },
  {
    id: "follow-up",
    name: "Follow-Up Email",
    description: "A friendly follow-up to check in with a lead",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
  <h2 style="color:#1a1a1a;font-size:20px;margin-bottom:8px;">Just checking in, {{name}}</h2>
  <p style="color:#555;font-size:15px;line-height:1.6;">I wanted to follow up and see if you had any questions about our available properties or services.</p>
  <p style="color:#555;font-size:15px;line-height:1.6;">We have several new listings that might be a great fit for you. I'd love to schedule a quick call to discuss your needs.</p>
  <a href="#" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Schedule a Call</a>
  <p style="color:#999;font-size:12px;margin-top:32px;">You're receiving this because you expressed interest in our properties.</p>
</div>`,
  },
  {
    id: "property-showcase",
    name: "Property Showcase",
    description: "Highlight a property or listing",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
  <h2 style="color:#1a1a1a;font-size:22px;margin-bottom:4px;">New Listing Just For You, {{name}}</h2>
  <p style="color:#777;font-size:13px;margin-bottom:20px;">We thought this might interest you</p>
  <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <div style="background:#f3f4f6;padding:40px;text-align:center;color:#9ca3af;font-size:14px;">Property Image Placeholder</div>
    <div style="padding:20px;">
      <h3 style="color:#1a1a1a;font-size:18px;margin:0 0 6px;">Beautiful 3BR Home</h3>
      <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">123 Main Street, Anytown, USA</p>
      <p style="color:#2563eb;font-size:20px;font-weight:700;margin:0 0 12px;">$450,000</p>
      <p style="color:#555;font-size:14px;line-height:1.6;">Spacious 3-bedroom, 2-bathroom home with modern finishes, open floor plan, and a beautiful backyard. Don't miss this opportunity!</p>
      <a href="#" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">View Property</a>
    </div>
  </div>
  <p style="color:#999;font-size:12px;margin-top:24px;">To unsubscribe from future emails, click here.</p>
</div>`,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description: "A professional newsletter template",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#1e293b;padding:20px 24px;text-align:center;">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700;">Realty Insider</h1>
    <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">Your Monthly Real Estate Update</p>
  </div>
  <div style="padding:24px;">
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi {{name}},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">Here's your monthly roundup of real estate market insights, new listings, and tips to help you make the most of your investment.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <h3 style="color:#1a1a1a;font-size:16px;margin-bottom:8px;">🏡 Market Update</h3>
    <p style="color:#555;font-size:14px;line-height:1.6;">The market continues to show strong growth with median home prices up 5% year-over-year. Inventory remains tight, making it a great time for sellers.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <h3 style="color:#1a1a1a;font-size:16px;margin-bottom:8px;">📊 Tips &amp; Insights</h3>
    <p style="color:#555;font-size:14px;line-height:1.6;">Now is a great time to review your portfolio and consider which properties could benefit from strategic improvements to maximize value.</p>
    <a href="#" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Read Full Report</a>
  </div>
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">© 2024 Realty CRM. All rights reserved.</p>
  </div>
</div>`,
  },
  {
    id: "custom",
    name: "Custom Template",
    description: "Start from scratch with a blank template",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
  <h2 style="color:#1a1a1a;">Hi {{name}},</h2>
  <p style="color:#555;font-size:15px;line-height:1.6;">Write your email content here.</p>
</div>`,
  },
];

// --- Component ---
export default function EmailTemplateBuilder({
  workspaceId: _workspaceId,
  onUse,
  onClose,
}: EmailTemplateBuilderProps) {
  const [selected, setSelected] = useState<EmailTemplateData | null>(null);
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview");
  const [editedHtml, setEditedHtml] = useState<string>("");

  const handleSelect = (template: EmailTemplateData) => {
    setSelected(template);
    setEditedHtml(template.html);
    setPreviewMode("preview");
  };

  const handleUse = () => {
    if (!selected) return;
    const finalTemplate: EmailTemplateData = { ...selected, html: editedHtml };
    onUse(editedHtml, finalTemplate);
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-foreground">Template Builder</h2>
          {selected && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-sm text-muted-foreground">{selected.name}</span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Template List */}
        <div className="w-64 shrink-0 border-r border-border bg-card flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Templates</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  selected?.id === template.id
                    ? "border-blue-500/50 bg-blue-500/5"
                    : "border-transparent hover:border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground leading-tight truncate">{template.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{template.description}</p>
                  </div>
                  {selected?.id === template.id && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview / Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shrink-0">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
                  <button
                    onClick={() => setPreviewMode("preview")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
                      previewMode === "preview"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setPreviewMode("code")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
                      previewMode === "code"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    HTML
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={handleUse}
                  className="h-7 px-4 text-[12px] bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                  Use Template
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto">
                {previewMode === "preview" ? (
                  <div className="h-full bg-muted/30 p-6">
                    <div className="mx-auto max-w-[640px] rounded-lg border border-border bg-white shadow-sm overflow-hidden">
                      <iframe
                        srcDoc={editedHtml}
                        className="w-full"
                        style={{ minHeight: "500px", border: "none" }}
                        sandbox="allow-same-origin"
                        title="Email Preview"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full p-4">
                    <textarea
                      value={editedHtml}
                      onChange={(e) => setEditedHtml(e.target.value)}
                      className="h-full min-h-[400px] w-full rounded-md border border-border bg-muted/50 p-3 font-mono text-[12px] text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground/20" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Select a template to get started</p>
                <p className="text-[12px] text-muted-foreground/60 mt-1">Choose from the list on the left or start with a custom template</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
