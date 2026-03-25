"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Users,
  X,
  Clock,
  Megaphone,
  Tag,
  Trash2,
  Calendar,
  Settings,
  Mail,
  Eye,
  ArrowLeft,
  ExternalLink,
  MousePointer2,
  CheckCircle2,
  History as HistoryIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import CampaignCanvas from "./CampaignCanvas";
import { ContentLoader } from "@/components/ui/content-loader";

// ── Types ─────────────────────────────────────────────────────────────
interface Campaign {
  _id: string;
  name: string;
  status: string;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignsViewProps {
  workspaceId: string;
  userRole?: string;
  onCloseSidebar?: () => void;
}

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
  { key: "name", label: "Name", icon: Megaphone },
  { key: "description", label: "Description", icon: Settings },
  { key: "status", label: "Status", icon: Tag },
  { key: "createdAt", label: "Created", icon: Clock },
];

export default function CampaignsView({
  workspaceId,
  userRole = "AGENT",
  onCloseSidebar,
}: CampaignsViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(
    new Set(),
  );
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCanvasId, setShowCanvasId] = useState<string | null>(null);

  // new-campaign form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);


  // ── Fetch campaigns ───────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await api(`/campaign/${workspaceId}`);
      if (res.ok) {
        const result = await res.json();
        setCampaigns(Array.isArray(result.data) ? result.data : []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Keep selected campaign in sync after refetch
  useEffect(() => {
    if (selectedCampaign) {
      const updated = campaigns.find((c) => c._id === selectedCampaign._id);
      if (updated) setSelectedCampaign(updated);
    }
  }, [campaigns]);

  // ── Create campaign ───────────────────────────────────────────────────
  async function handleCreate() {
    if (!newName.trim()) {
      setFormError("Name is required");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await api("/campaign/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || "No description provided",
          status: "created",
          workspaceId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || "Failed to create campaign");
        return;
      }
      setNewName("");
      setNewDescription("");
      setShowNewForm(false);
      fetchCampaigns();
    } catch {
      setFormError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Row click ─────────────────────────────────────────────────────
  function handleRowClick(campaign: Campaign) {
    setSelectedCampaign(
      selectedCampaign?._id === campaign._id ? null : campaign,
    );
  }

  // ── Selection & Bulk Ops ──────────────────────────────────────────
  function toggleAll() {
    if (selectedCampaignIds.size === campaigns.length) {
      setSelectedCampaignIds(new Set());
    } else {
      setSelectedCampaignIds(new Set(campaigns.map((c) => c._id)));
    }
  }

  function toggleCampaign(id: string) {
    const next = new Set(selectedCampaignIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCampaignIds(next);
  }

  async function handleBulkDelete() {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedCampaignIds.size} campaigns?`,
      )
    )
      return;

    setSubmitting(true);
    try {
      for (const id of selectedCampaignIds) {
        await api(`/campaign/${id}`, {
          method: "DELETE",
        });
      }
      setSelectedCampaignIds(new Set());
      fetchCampaigns();
    } catch {
      alert("Failed to delete some campaigns.");
    } finally {
      setTimeout(() => setSubmitting(false), 500);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* ── Main table area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold text-foreground">Campaigns</h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedCampaignIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={submitting}
                className="h-7 gap-1.5 rounded-md px-3 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>Delete Selected ({selectedCampaignIds.size})</>
                )}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowNewForm(true)}
              className="h-7 gap-1.5 rounded-md px-3 text-xs"
            >
              <Plus className="h-3 w-3" />
              New campaign
            </Button>
          </div>
        </div>

        {/* Sub-header: count */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-1.5">
          <span className="text-xs text-muted-foreground">
            All Campaigns · {campaigns.length}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[800px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500"
                    checked={
                      campaigns.length > 0 &&
                      selectedCampaignIds.size === campaigns.length
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
              {/* Loading State */}
              {loading && (
                <tr>
                  <td colSpan={5} className="py-12">
                    <ContentLoader loading={loading} text="Fetching campaigns..." />
                  </td>
                </tr>
              )}

              {/* ── Existing campaigns ────────────────────────────────── */}
              {campaigns.map((campaign) => (
                <tr
                  key={campaign._id}
                  onClick={(e) => {
                    if (
                      (e.target as HTMLElement).tagName.toLowerCase() ===
                      "input"
                    )
                      return;
                    handleRowClick(campaign);
                  }}
                  className={`cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                    selectedCampaign?._id === campaign._id
                      ? "bg-white/[0.05]"
                      : ""
                  } ${selectedCampaignIds.has(campaign._id) ? "bg-blue-500/[0.02]" : ""}`}
                >
                  {/* Select */}
                  <td className="px-4 py-2.5 w-10">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500"
                      checked={selectedCampaignIds.has(campaign._id)}
                      onChange={() => toggleCampaign(campaign._id)}
                    />
                  </td>

                  {/* Name */}
                  <td className="px-4 py-2.5 font-medium">{campaign.name}</td>

                  {/* Description */}
                  <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[200px]">
                    {campaign.description || ""}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-2.5">
                    <span className="inline-block rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] text-blue-400 capitalize">
                      {campaign.status || "draft"}
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                    {timeAgo(campaign.createdAt)}
                  </td>
                </tr>
              ))}

              {/* ── "+ Add New" row ─── */}
              {!showNewForm ? (
                <tr>
                  <td colSpan={5}>
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
                      placeholder="Campaign name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/10"
                      autoFocus
                    />
                  </td>
                  {/* Description */}
                  <td className="px-4 py-2">
                    <Input
                      placeholder="Description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/10"
                    />
                  </td>
                  {/* Status (defaults to draft) */}
                  <td className="px-4 py-2">
                    <span className="inline-block rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] text-blue-400">
                      draft
                    </span>
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
                        {submitting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Save"
                        )}
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
              {!loading && campaigns.length === 0 && !showNewForm && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground/60">
                          Fetching campaigns...
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          No campaigns yet
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/60">
                          Click "+ New campaign" to create your first automated
                          campaign.
                        </p>
                      </>
                    )}
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
        {campaigns.length > 0 && (
          <div className="flex items-center gap-6 border-t border-white/[0.06] px-5 py-2 text-[11px] text-muted-foreground">
            <span>Count all {campaigns.length}</span>
          </div>
        )}
      </div>

      {/* ── Detail panel (right side) ───────────────────────────────── */}
      {selectedCampaign && (
        <CampaignDetailPanel
          campaign={selectedCampaign}
          workspaceId={workspaceId}
          onClose={() => setSelectedCampaign(null)}
          onLaunchEditor={() => setShowCanvasId(selectedCampaign._id)}
        />
      )}

      {/* ── Visual Canvas Overlay ───────────────────────────────────── */}
      {showCanvasId &&
        selectedCampaign &&
        showCanvasId === selectedCampaign._id && (
          <CampaignCanvas
            campaignId={selectedCampaign._id}
            campaignName={selectedCampaign.name}
            workspaceId={workspaceId}
            onClose={() => setShowCanvasId(null)}
            onCloseSidebar={onCloseSidebar}
          />
        )}
    </div>
  );
}

// ── Detail Panel Component ──────────────────────────────────────────────
function CampaignDetailPanel({
  campaign,
  workspaceId,
  onClose,
  onLaunchEditor,
}: {
  campaign: Campaign;
  workspaceId: string;
  onClose: () => void;
  onLaunchEditor: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "activity">(
    "overview",
  );

  return (
    <div className="w-[400px] border-l border-white/[0.06] bg-background p-5 flex flex-col h-full animate-in slide-in-from-right-8 duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {campaign.name}
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/[0.06] mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2.5 text-xs font-medium transition-colors ${
            activeTab === "overview"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`pb-2.5 text-xs font-medium transition-colors ${
            activeTab === "activity"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`pb-2.5 text-xs font-medium transition-colors ${
            activeTab === "leads"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Leads
        </button>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-1">
        {activeTab === "overview" ? (
          <>
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className="inline-block rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] text-blue-400 capitalize">
                  {campaign.status || "draft"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Description
                </span>
                <span className="text-sm truncate max-w-[200px] text-right">
                  {campaign.description || "No description"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Created</span>
                <span className="text-sm">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Visual Canvas Placeholder */}
            <div className="mt-8 pt-6 border-t border-white/[0.06]">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Campaign Flow
              </h3>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3">
                <Megaphone className="w-8 h-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium">Visual Canvas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage your visual email sequence.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs h-7"
                  onClick={onLaunchEditor}
                >
                  Launch Editor
                </Button>
              </div>
            </div>
          </>
        ) : activeTab === "leads" ? (
          <CampaignLeadsTab campaign={campaign} workspaceId={workspaceId} />
        ) : (
          <CampaignEngagementTab
            campaign={campaign}
            workspaceId={workspaceId}
          />
        )}
      </div>
    </div>
  );
}

// ── Campaign Leads Tab ──────────────────────────────────────────────────────
function CampaignLeadsTab({
  campaign,
  workspaceId,
}: {
  campaign: Campaign;
  workspaceId: string;
}) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(
        `/lead/campaign/${campaign._id}/workspace/${workspaceId}`
      );
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [campaign._id, workspaceId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        const res = await api(`/campaign/${campaign._id}/steps`);
        if (res.ok) {
          const data = await res.json();
          setSteps(data.data || []);
        }
      } catch (err) {}
    };
    fetchSteps();
  }, [campaign._id]);

  if (selectedLead) {
    return (
      <CampaignLeadTracking
        lead={selectedLead}
        steps={steps}
        onBack={() => setSelectedLead(null)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Campaign Leads</h3>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="h-7 px-2.5 text-xs text-white bg-white/10 hover:bg-white/20 border-0"
          variant="outline"
        >
          <Plus className="h-3 w-3 mr-1.5" />
          Add Leads
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white/[0.02] rounded-md border border-white/[0.04] gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground/60">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-xs text-muted-foreground py-8 text-center bg-white/[0.02] rounded-md border border-white/[0.04]">
          No leads in this campaign yet.
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <div
              key={lead._id}
              onClick={() => setSelectedLead(lead)}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all cursor-pointer group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground group-hover:text-blue-400 transition-colors">
                  {lead.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-muted-foreground/60 truncate">
                    {lead.email}
                  </p>
                  {lead.tracking?.totalEmailsSent > 0 && (
                    <>
                      <span className="h-0.5 w-0.5 rounded-full bg-white/10" />
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                        <Mail className="h-2.5 w-2.5" />
                        {lead.tracking.totalEmailsSent}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {lead.tracking?.hasOpenedAny && (
                  <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-400 border border-green-500/20">
                    <Eye className="h-2.5 w-2.5" />
                    {lead.tracking.totalOpenCount}
                  </div>
                )}
                <span className="inline-block rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20 capitalize">
                  {lead.status || "new"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddLeadsToCampaignModal
          campaignId={campaign._id}
          workspaceId={workspaceId}
          existingLeadIds={new Set(leads.map((l) => l._id))}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchLeads}
        />
      )}
    </div>
  );
}

// ── Campaign Lead Tracking / Timeline View ──────────────────────────────────
function CampaignLeadTracking({
  lead,
  steps,
  onBack,
}: {
  lead: any;
  steps: any[];
  onBack: () => void;
}) {
  const getStepSubject = (stepId: string) => {
    return steps.find((s) => s._id === stepId)?.subject || "Unknown Step";
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Leads
      </button>

      {/* Header Info */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-foreground">{lead.name}</h4>
            <p className="text-xs text-muted-foreground/60">{lead.email}</p>
          </div>
          <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-tight border border-blue-500/25">
            {lead.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground/40 font-bold uppercase">
              Sent
            </p>
            <p className="text-lg font-bold text-foreground">
              {lead.tracking?.totalEmailsSent || 0}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground/40 font-bold uppercase">
              Opens
            </p>
            <p className="text-lg font-bold text-green-400">
              {lead.tracking?.totalOpenCount || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <h5 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
          <HistoryIcon className="h-3.5 w-3.5" /> Engagement Timeline
        </h5>

        <div className="relative space-y-6 pl-2">
          {/* Vertical Line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.06]" />

          {(lead.tracking?.stepsOpened || []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.08] p-6 text-center">
              <p className="text-[11px] text-muted-foreground/40">
                No engagement events yet.
              </p>
            </div>
          ) : (
            lead.tracking.stepsOpened
              .sort(
                (a: any, b: any) =>
                  new Date(b.openedAt).getTime() -
                  new Date(a.openedAt).getTime(),
              )
              .map((event: any, idx: number) => (
                <div key={idx} className="relative flex gap-4 group">
                  <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-green-500/30 bg-background shadow-sm ring-4 ring-background">
                    <MousePointer2 className="h-2.5 w-2.5 text-green-400" />
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-foreground">
                        Email Opened
                      </p>
                      <span className="text-[10px] text-muted-foreground/40 font-medium">
                        {timeAgo(event.openedAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                      Subject:{" "}
                      <span className="text-blue-400/80 italic">
                        {getStepSubject(event.stepId)}
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/60">
                        {event.openCount}{" "}
                        {event.openCount === 1 ? "Open" : "Opens"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
          )}

          {/* Initial "Sent" Event if any emails were sent */}
          {lead.tracking?.totalEmailsSent > 0 && (
            <div className="relative flex gap-4 group opacity-60">
              <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-background shadow-sm ring-4 ring-background">
                <Mail className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-medium text-foreground">
                  Campaign Started
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">
                  Lead enrolled in sequence
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Leads to Campaign Modal ─────────────────────────────────────────────
// ── Campaign Global Engagement Tab (Activity Feed) ──────────────────────────
function CampaignEngagementTab({
  campaign,
  workspaceId,
}: {
  campaign: Campaign;
  workspaceId: string;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<any[]>([]);

  const fetchCampaignData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, stepsRes] = await Promise.all([
        api(`/lead/campaign/${campaign._id}/workspace/${workspaceId}`),
        api(`/campaign/${campaign._id}/steps`),
      ]);

      if (leadsRes.ok && stepsRes.ok) {
        const leadsData = await leadsRes.json();
        const stepsData = await stepsRes.json();
        const leads = leadsData.leads || [];
        const fetchedSteps = stepsData.data || [];
        setSteps(fetchedSteps);

        // Flatten all opens into a single timeline
        const allEvents: any[] = [];
        leads.forEach((lead: any) => {
          (lead.tracking?.stepsOpened || []).forEach((open: any) => {
            allEvents.push({
              ...open,
              leadName: lead.name,
              leadEmail: lead.email,
              leadId: lead._id,
            });
          });
        });

        // Sort by date descending
        allEvents.sort(
          (a, b) =>
            new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
        );
        setEvents(allEvents);
      }
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [campaign._id, workspaceId]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  const getStepSubject = (stepId: string) => {
    return steps.find((s) => s._id === stepId)?.subject || "Unknown Step";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pr-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-blue-400" />
          Engagement Feed
        </h3>
        <span className="text-[10px] bg-white/[0.04] px-2 py-0.5 rounded-full text-muted-foreground/60 font-bold uppercase">
          {events.length} Events
        </span>
      </div>

      <div className="relative space-y-6 pl-2">
        {/* Vertical line connection */}
        {events.length > 0 && (
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.06]" />
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white/[0.02] rounded-xl border border-white/[0.04] gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground/60">
              Loading activity...
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-xs text-muted-foreground py-12 text-center bg-white/[0.02] rounded-xl border border-dashed border-white/[0.08]">
            <MousePointer2 className="h-8 w-8 text-muted-foreground/10 mx-auto mb-3" />
            <p>No engagement recorded yet.</p>
            <p className="text-[10px] mt-1 opacity-50">
              Activity will appear here as leads interact with emails.
            </p>
          </div>
        ) : (
          events.map((event, idx) => (
            <div key={idx} className="relative flex gap-4 group">
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-background shadow-sm ring-4 ring-background">
                <Eye className="h-3 w-3 text-blue-400" />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold text-foreground">
                    {event.leadName}{" "}
                    <span className="text-[10px] font-medium text-muted-foreground/40 ml-1">
                      opened email
                    </span>
                  </p>
                  <span className="text-[10px] text-muted-foreground/40 font-medium whitespace-nowrap">
                    {timeAgo(event.openedAt)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">
                  <span className="text-blue-400/60 mr-1 italic">Step:</span>
                  {getStepSubject(event.stepId)}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-400/80 border border-green-500/20">
                    <MousePointer2 className="h-2.5 w-2.5" />
                    {event.openCount} {event.openCount === 1 ? "Open" : "Opens"}
                  </div>
                  <span className="text-[9px] text-muted-foreground/30">•</span>
                  <span className="text-[9px] text-muted-foreground/40 font-medium">
                    {new Date(event.openedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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

// ── Add Leads to Campaign Modal ─────────────────────────────────────────────
function AddLeadsToCampaignModal({
  campaignId,
  workspaceId,
  existingLeadIds,
  onClose,
  onSuccess,
}: {
  campaignId: string;
  workspaceId: string;
  existingLeadIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api(`/lead/workspace/${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          setAllLeads(data.leads || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [workspaceId]);

  const availableLeads = allLeads.filter((l) => !existingLeadIds.has(l._id));

  const toggleLead = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const submit = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const res = await api("/lead/assignCampaingToLeads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leads: Array.from(selectedIds),
          campaignId,
          workspaceId,
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert("Failed to assign leads");
      }
    } catch {
      alert("Error assigning leads");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#121212] p-6 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Add Leads to Campaign
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 mb-4 space-y-2">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Loading...
            </p>
          ) : availableLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No available leads to add.
            </p>
          ) : (
            availableLeads.map((lead) => (
              <label
                key={lead._id}
                className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                  selectedIds.has(lead._id)
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500"
                  checked={selectedIds.has(lead._id)}
                  onChange={() => toggleLead(lead._id)}
                />
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    {lead.name}
                  </p>
                  {lead.email && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {lead.email}
                    </p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.08]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={submitting || selectedIds.size === 0}
            className="h-8 text-xs min-w-[100px]"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            ) : null}
            {submitting ? "Adding..." : `Add ${selectedIds.size} Leads`}
          </Button>
        </div>
      </div>
    </div>
  );
}
