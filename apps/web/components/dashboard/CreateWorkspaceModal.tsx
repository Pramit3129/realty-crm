"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { API_BASE_URL, getToken } from "@/lib/auth";

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (workspaceId: string) => void;
}) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) {
      setError("Workspace name is required");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/workspace/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create workspace");
        return;
      }

      const newWorkspace = await res.json();
      onSuccess(newWorkspace._id);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-xl border border-border/50 bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Create Workspace
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Provide a name for your new workspace.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="e.g. Dream Team CRM"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && handleCreateWorkspace()
            }
            className="border-border/60 bg-background/50 py-5 transition-colors focus:border-primary/60"
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="border-border/60">
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              disabled={isSubmitting || !workspaceName.trim()}
              className="bg-primary"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
