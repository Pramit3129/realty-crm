"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X, Play, Clock, Plus, PenSquare, Trash2, Megaphone, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import EmailTemplateBuilder, { type EmailTemplateData } from "./EmailTemplateBuilder";

// --- Types ---
interface CampaignStep {
  _id: string;
  campaignId: string;
  subject: string;
  body: string;
  delayDays: number;
  stepOrder: number;
}

// --- Custom Nodes ---

// Action Node (Step)
function ActionNode({ data }: NodeProps) {
  const isRunning = !(data as any).onEdit;
  return (
    <div 
      className={`group flex w-[280px] flex-col rounded-xl border bg-card shadow-xl transition-all ${
        isRunning 
          ? "border-blue-500/30 cursor-default opacity-90" 
          : "border-border hover:border-muted-foreground/50 cursor-pointer"
      }`}
      onClick={() => (data as any).onEdit?.(data.step)}
    >
      {!data.isFirst && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-card !border-2 !border-muted-foreground/50" />
      )}
      <div className="flex items-start justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400">
            <Megaphone className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action</p>
            <p className="text-[13px] font-semibold text-foreground truncate w-[160px]">{data.subject as string}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Delay: {data.delayDays as number} day(s)
      </div>

      <div className="absolute -right-10 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            (data as any).onDelete?.(data.step);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
          title="Delete Step"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-card !border-2 !border-muted-foreground/50" />
    </div>
  );
}

// Add Node Button
function AddNode({ data }: NodeProps) {
  return (
    <div className="flex w-[280px] items-center justify-center py-2">
      <Handle type="target" position={Position.Top} className="!border-none !bg-transparent text-transparent" />
      <button
        onClick={() => (data as any).onAdd?.()}
        className="flex items-center gap-2 rounded-full border border-dashed border-border bg-card px-4 py-2 text-[12px] text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground hover:bg-muted"
      >
        <Plus className="h-4 w-4" />
        Add Step
      </button>
    </div>
  );
}

const nodeTypes = {
  actionNode: ActionNode,
  addNode: AddNode,
};

// --- Main Canvas Component ---
export default function CampaignCanvas({
  campaignId,
  campaignName,
  workspaceId,
  onClose,
  onCloseSidebar,
}: {
  campaignId: string;
  campaignName: string;
  workspaceId: string;
  onClose: () => void;
  onCloseSidebar?: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [steps, setSteps] = useState<CampaignStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignStatus, setCampaignStatus] = useState<string>("created");
  const [progress, setProgress] = useState({ total: 0, sent: 0, percentage: 0 });
  const isCreatingDefault = useRef(false);

  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<CampaignStep | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const fetchCampaignInfo = useCallback(async () => {
    try {
      const [stepsRes, progressRes] = await Promise.all([
        api(`/campaign/${campaignId}/steps`),
        api(`/campaign/progress/${campaignId}`)
      ]);

      if (stepsRes.ok) {
        const data = await stepsRes.json();
        let fetchedSteps = data.data || [];

        // Auto-create a demo step if none exist
        if (fetchedSteps.length === 0 && !isCreatingDefault.current) {
          isCreatingDefault.current = true;
          try {
            const createRes = await api("/campaign/step/create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                campaignId,
                subject: "Welcome Demo Email",
                body: "Hi {{name}},\n\nThis is a sample welcome email for the campaign. Feel free to edit or replace this text.",
                delayDays: 0,
                stepOrder: 1,
              }),
            });
            if (createRes.ok) {
              const createdData = await createRes.json();
              if (createdData.data) {
                fetchedSteps = [createdData.data];
              }
            }
          } catch (e) {
            console.error(e);
          } finally {
            isCreatingDefault.current = false;
          }
        }
        setSteps(fetchedSteps.sort((a: any, b: any) => a.stepOrder - b.stepOrder));
      }

      if (progressRes.ok) {
        const data = await progressRes.json();
        setProgress(data.data);
      }

      // Also get actual campaign status
      const campaignRes = await api(`/campaign/details/${campaignId}`);
      if (campaignRes.ok) {
        const data = await campaignRes.json();
        setCampaignStatus(data.data?.status || "created");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const fetchSteps = fetchCampaignInfo; // keep compatibility with existing calls

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  useEffect(() => {
    if (campaignStatus === "running") {
      const interval = setInterval(fetchCampaignInfo, 5000);
      return () => clearInterval(interval);
    }
  }, [campaignStatus, fetchCampaignInfo]);

  const handleEditStep = useCallback((step: CampaignStep) => {
    setEditingStep(step);
    setShowStepModal(true);
  }, []);

  const handleDeleteStep = useCallback(async (step: CampaignStep) => {
    if (!confirm(`Are you sure you want to delete step: ${step.subject}?`)) return;
    try {
      const res = await api(`/campaign/step/${step._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchSteps();
      } else {
        alert("Failed to delete step");
      }
    } catch {
      alert("Error deleting step");
    }
  }, [fetchSteps]);

  const handleAddStepClick = useCallback(() => {
    setEditingStep(null);
    setShowStepModal(true);
  }, []);

  const handleStartCampaign = async () => {
    setStarting(true);
    try {
      // 1. Fetch leads for this campaign
      const leadsRes = await api(
        `/lead/campaign/${campaignId}/workspace/${workspaceId}`
      );
      if (!leadsRes.ok) throw new Error("Could not fetch campaign leads");
      const leadsData = await leadsRes.json();
      const leads = leadsData.leads || [];

      if (leads.length === 0) {
        alert("This campaign has no leads! Please add leads before starting.");
        setStarting(false);
        return;
      }

      // 2. Format leads for start endpoint
      const formattedLeads = leads.map((l: any) => ({
        leadId: l._id,
        email: l.email,
        name: l.name,
      }));

      // 3. Start campaign
      const startRes = await api("/campaign/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignId, leads: formattedLeads }),
      });

      if (startRes.ok) {
        alert("Campaign started successfully!");
        fetchCampaignInfo();
      } else {
        const errData = await startRes.json();
        alert(errData.message || "Failed to start campaign");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred starting the campaign.");
    } finally {
      setStarting(false);
    }
  };

  const handleStopCampaign = async () => {
    setStopping(true);
    try {
      const res = await api("/campaign/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignId }),
      });

      if (res.ok) {
        alert("Campaign stopped/paused successfully!");
        fetchCampaignInfo();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to stop campaign");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred stopping the campaign.");
    } finally {
      setStopping(false);
    }
  };

  // Sync steps to React Flow nodes/edges
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    const startY = 100;
    const ySpacing = 180;
    const xPos = 400; // center-ish

    let lastNodeId: string | null = null;
    let currY = startY;

    // 1. Action Nodes (Steps)
    steps.forEach((step, index) => {
      const nodeId = `step-${step._id}`;
      newNodes.push({
        id: nodeId,
        type: "actionNode",
        position: { x: xPos, y: currY },
        data: {
          subject: step.subject,
          delayDays: step.delayDays,
          step: step,
          isFirst: index === 0,
          onEdit: campaignStatus === "running" ? undefined : handleEditStep,
          onDelete: campaignStatus === "running" ? undefined : handleDeleteStep,
        },
      });

      if (lastNodeId) {
        newEdges.push({
          id: `edge-${lastNodeId}-${nodeId}`,
          source: lastNodeId,
          target: nodeId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "currentColor" },
          style: { strokeWidth: 2 },
          className: "text-muted-foreground/40",
        });
      }

      lastNodeId = nodeId;
      currY += ySpacing;
    });

    // 2. Add Button Node
    const addNodeId = "add-btn";
    if (campaignStatus !== "running") {
      newNodes.push({
        id: addNodeId,
        type: "addNode",
        position: { x: xPos, y: currY },
        data: {
          onAdd: handleAddStepClick,
        },
      });

      if (lastNodeId) {
        newEdges.push({
          id: `edge-${lastNodeId}-${addNodeId}`,
          source: lastNodeId,
          target: addNodeId,
          type: "straight",
          animated: true,
          style: { strokeWidth: 2, strokeDasharray: "5,5" },
          className: "text-muted-foreground/40",
        });
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [steps, setNodes, setEdges, handleEditStep, handleDeleteStep, handleAddStepClick]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background animate-in slide-in-from-right-8 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Megaphone className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-none">
              {campaignName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${campaignStatus === 'running' ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {campaignStatus}
              </p>
            </div>
          </div>
        </div>

        {campaignStatus === 'running' && (
          <div className="flex-1 max-w-[300px] mx-8">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Sending Emails</span>
                <span className="text-[10px] font-bold text-blue-500">{progress.percentage}%</span>
             </div>
             <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500" 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
             </div>
             <p className="text-[9px] text-muted-foreground mt-1">
                {progress.sent} of {progress.total} emails sent
             </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          {campaignStatus === "running" ? (
            <Button
              size="sm"
              onClick={handleStopCampaign}
              disabled={stopping}
              className="h-8 gap-1.5 rounded-md px-4 text-xs bg-red-600 hover:bg-red-700 text-white border-0 shadow-md transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              {stopping ? "Stopping..." : "Stop Campaign"}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStartCampaign}
              disabled={starting}
              className="h-8 gap-1.5 rounded-md px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md transition-colors"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {starting ? "Starting..." : campaignStatus === "paused" ? "Resume Campaign" : "Start Campaign"}
            </Button>
          )}

          <div className="h-4 w-px bg-border mx-1"></div>
          {campaignStatus !== "running" && (
            <Button
              size="sm"
              onClick={handleAddStepClick}
              className="h-8 gap-1.5 rounded-md px-3 text-xs bg-muted hover:bg-muted-foreground/20 text-foreground border-0"
              variant="outline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Step
            </Button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading flow...
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-background"
          >
            <Background gap={24} size={2} className="text-muted-foreground/20" color="currentColor" />
            <Controls className="[&>button]:!bg-card [&>button]:!border-b-border [&>button]:!text-foreground [&>button:hover]:!bg-muted !shadow-md" />
          </ReactFlow>
        )}
      </div>

      {/* Step Modal */}
      {showStepModal && (
        <StepEditorModal
          campaignId={campaignId}
          step={editingStep}
          nextOrder={steps.length + 1}
          onClose={() => setShowStepModal(false)}
          onSuccess={() => {
            setShowStepModal(false);
            fetchSteps();
          }}
          workspaceId={workspaceId}
          onCloseSidebar={onCloseSidebar}
        />
      )}
    </div>
  );
}

// --- Step Editor Modal ---
function StepEditorModal({
  campaignId,
  step,
  nextOrder,
  onClose,
  onSuccess,
  workspaceId,
  onCloseSidebar,
}: {
  campaignId: string;
  step: CampaignStep | null;
  nextOrder: number;
  onClose: () => void;
  onSuccess: () => void;
  workspaceId: string;
  onCloseSidebar?: () => void;
}) {
  const [subject, setSubject] = useState(step?.subject || "");
  const [body, setBody] = useState(step?.body || "");
  const [delayDays, setDelayDays] = useState(step?.delayDays || 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);

  const isEditing = !!step;

  const handleUseTemplate = (html: string, template: EmailTemplateData) => {
    setBody(html);
    if (!subject.trim() && template.name && template.name !== "Custom Template") {
      setSubject(template.name);
    }
    setShowBuilder(false);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and Body are required.");
      return;
    }
    setSubmitting(true);
    setError("");

    const endpoint = isEditing ? `/campaign/step/${step._id}` : `/campaign/step/create`;
    const method = isEditing ? "PUT" : "POST";
    const payload = {
      campaignId,
      subject,
      body,
      delayDays: Number(delayDays),
      stepOrder: isEditing ? step.stepOrder : nextOrder,
    };

    try {
      const res = await api(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to save step");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (showBuilder) {
    return (
      <EmailTemplateBuilder
        workspaceId={workspaceId}
        onUse={handleUseTemplate}
        onClose={() => setShowBuilder(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {isEditing ? "Edit Action Node" : "Add Action Node"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Welcome to our newsletter!"
              className="h-9 border-border bg-muted/50 text-[13px]"
            />
          </div>

          {/* Email Body */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[13px] font-medium text-muted-foreground">Email Body</label>
              <button
                onClick={() => {
                  onCloseSidebar?.();
                  setShowBuilder(true);
                }}
                className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-500"
              >
                <LayoutTemplate className="h-3 w-3" />
                Template Builder
              </button>
            </div>

            {body ? (
              <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
                {/* Preview strip */}
                <div className="border-b border-border px-3 py-1.5 flex items-center justify-between bg-muted/50">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Preview</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onCloseSidebar?.();
                        setShowBuilder(true);
                      }}
                      className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <PenSquare className="h-2.5 w-2.5" />
                      Edit in Builder
                    </button>
                    <span className="text-muted-foreground/40">|</span>
                    <button
                      onClick={() => setBody("")}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <iframe
                  srcDoc={body}
                  className="w-full max-h-[160px] pointer-events-none"
                  style={{ border: "none", minHeight: "80px" }}
                  sandbox=""
                  title="Email Body Preview"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/20 py-8">
                <LayoutTemplate className="h-8 w-8 text-muted-foreground/30" />
                <div className="text-center">
                  <p className="text-[13px] font-medium text-muted-foreground">No email body yet</p>
                  <p className="text-[11px] text-muted-foreground/60">Use the template builder or paste HTML below</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onCloseSidebar?.();
                      setShowBuilder(true);
                    }}
                    className="h-7 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <LayoutTemplate className="mr-1.5 h-3 w-3" />
                    Open Builder
                  </Button>
                  <span className="text-[11px] text-muted-foreground">or</span>
                  <button
                    onClick={() => setBody("<p>Write your email here...</p>")}
                    className="text-[11px] text-muted-foreground underline hover:text-foreground"
                  >
                    paste HTML
                  </button>
                </div>
              </div>
            )}

            {/* Allow direct HTML editing when body is set */}
            {body && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                  Edit raw HTML
                </summary>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="mt-1.5 min-h-[80px] w-full rounded-md border border-border bg-muted/50 p-2 text-[11px] text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                />
              </details>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">Delay (Days) after previous step</label>
            <Input
              type="number"
              min="0"
              value={delayDays}
              onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
              className="h-9 border-border bg-muted/50 text-[13px]"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="text-xs h-8">
            {submitting ? "Saving..." : "Save Step"}
          </Button>
        </div>
      </div>
    </div>
  );
}
