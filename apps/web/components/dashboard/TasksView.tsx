"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  CheckSquare,
  X,
  Users,
  Search,
  Check,
  ChevronDown,
  Clock,
  Trash2,
  ListTodo,
  Columns3,
  UserSquare2,
  Calendar,
  MoreVertical,
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

interface User {
  _id: string;
  name: string;
}

interface Task {
  _id: string;
  title: string;
  status: string;
  body: string;
  dueDate?: string;
  assigneeId?: User;
  relations: Lead[];
  realtorId: User;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface TasksViewProps {
  workspaceId: string;
  subView: "tasks-all" | "tasks-status" | "tasks-me";
}

const TASK_STATUSES = ["To do", "In progress", "Done", "No Value"];

// ── Helpers ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `about ${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `about ${days} day${days > 1 ? "s" : ""} ago`;
}

function getStatusStyle(status: string) {
  switch (status) {
    case "To do": return { bg: "rgba(59,130,246,0.18)", text: "#60a5fa", dot: "#3b82f6" };
    case "In progress": return { bg: "rgba(168,85,247,0.18)", text: "#c084fc", dot: "#a855f7" };
    case "Done": return { bg: "rgba(34,197,94,0.18)", text: "#4ade80", dot: "#22c55e" };
    default: return { bg: "rgba(255,255,255,0.1)", text: "#999", dot: "#666" };
  }
}

// ══════════════════════════════════════════════════════════════════════
// TasksView
// ══════════════════════════════════════════════════════════════════════
export default function TasksView({ workspaceId, subView }: TasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]); // To simulate workspace users if available
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // New task inline form in table
  const [showNewRow, setShowNewRow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("To do");

  const token = getToken();

  // ── Data Fetching ───────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/task/workspace/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
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

  const fetchCurrentUser = useCallback(() => {
    try {
      if (token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        if (decoded.id) {
          setCurrentUser({ id: decoded.id });
        }
      }
    } catch {
      /* silent */
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
    fetchLeads();
    fetchCurrentUser();
  }, [fetchTasks, fetchLeads, fetchCurrentUser]);

  // Update selectedTask if tasks change
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t) => t._id === selectedTask._id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  // Deriving workspace possible assignees from tasks simply:
  useEffect(() => {
    const userMap = new Map<string, User>();
    tasks.forEach((t) => {
      if (t.assigneeId) userMap.set(t.assigneeId._id, t.assigneeId);
      if (t.realtorId) userMap.set(t.realtorId._id, t.realtorId);
    });
    setUsers(Array.from(userMap.values()));
  }, [tasks]);

  // ── Operations ──────────────────────────────────────────────────────
  async function handleCreate(statusOverride?: string) {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/task/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          status: statusOverride || newStatus,
          workspaceId,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewStatus("To do");
        setShowNewRow(false);
        fetchTasks();
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(taskId: string, fields: Partial<Task>) {
    try {
      const res = await fetch(`${API_BASE_URL}/task/details/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fields),
      });
      if (res.ok) fetchTasks();
    } catch {
      /* silent */
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/task/details/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (selectedTask?._id === taskId) setSelectedTask(null);
        fetchTasks();
      }
    } catch {
      /* silent */
    }
  }

  // ── View Filtering ──────────────────────────────────────────────────
  let displayedTasks = tasks;
  if (subView === "tasks-me" && currentUser) {
    displayedTasks = tasks.filter((t) => t.assigneeId?._id === currentUser.id);
  }

  const iconForSubView = {
    "tasks-all": <ListTodo className="h-4 w-4 text-muted-foreground" />,
    "tasks-status": <Columns3 className="h-4 w-4 text-muted-foreground" />,
    "tasks-me": <UserSquare2 className="h-4 w-4 text-muted-foreground" />,
  }[subView];

  const titleForSubView = {
    "tasks-all": "All Tasks",
    "tasks-status": "Tasks by Status",
    "tasks-me": "Assigned to Me",
  }[subView];


  // ════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-1 overflow-hidden bg-background gap-0 text-[13px]">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-2">
            {iconForSubView}
            <h1 className="text-sm font-semibold text-foreground">{titleForSubView}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setShowNewRow(true);
                setSelectedTask(null);
              }}
              className="h-7 gap-1.5 rounded-md px-3 text-xs"
            >
              <Plus className="h-3 w-3" />
              New task
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-1.5">
          <span className="text-xs text-muted-foreground">
            {titleForSubView} · {displayedTasks.length}
          </span>
        </div>

        {/* Content area based on subView */}
        <div className="flex-1 overflow-auto">
          {subView === "tasks-status" ? (
            <KanbanBoard
              tasks={displayedTasks}
              onUpdate={handleUpdate}
              onAdd={(status: string) => {
                setNewTitle("New Task");
                setNewStatus(status);
                handleCreate(status);
              }}
              onTaskClick={setSelectedTask}
            />
          ) : (
            <TasksTable
              tasks={displayedTasks}
              showNewRow={showNewRow}
              setShowNewRow={setShowNewRow}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              newStatus={newStatus}
              setNewStatus={setNewStatus}
              handleCreate={() => handleCreate()}
              submitting={submitting}
              onTaskClick={setSelectedTask}
              selectedTaskId={selectedTask?._id}
              onUpdate={handleUpdate}
              leads={leads}
            />
          )}
        </div>
      </div>

      {/* Slide-over Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          leads={leads}
          users={users} // ideally full workspace members
          onClose={() => setSelectedTask(null)}
          onUpdate={(fields: any) => handleUpdate(selectedTask._id, fields)}
          onDelete={() => handleDelete(selectedTask._id)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Table View Component
// ══════════════════════════════════════════════════════════════════════
function TasksTable({
  tasks,
  showNewRow,
  setShowNewRow,
  newTitle,
  setNewTitle,
  newStatus,
  setNewStatus,
  handleCreate,
  submitting,
  onTaskClick,
  selectedTaskId,
  onUpdate,
  leads
}: any) {
  return (
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
            <span className="flex items-center gap-1.5"><CheckSquare className="h-3 w-3" />Title</span>
          </th>
          <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3" />Status</span>
          </th>
          <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground w-48">
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />Relations</span>
          </th>
          <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><UserSquare2 className="h-3 w-3" />Created by</span>
          </th>
          <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />Due Date</span>
          </th>
          <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><UserSquare2 className="h-3 w-3" />Assignee</span>
          </th>
          <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />Creation date</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task: Task) => (
          <tr
            key={task._id}
            onClick={() => onTaskClick(task)}
            className={`cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${selectedTaskId === task._id ? "bg-white/[0.05]" : ""}`}
          >
            <td className="px-4 py-2.5">
              <input type="checkbox" className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500" onClick={e=>e.stopPropagation()}/>
            </td>
            <td className="px-4 py-2.5 break-all min-w-[120px] font-medium text-foreground">
              {task.title || "Untitled"}
            </td>
            <td className="px-4 py-2.5">
              <StatusBadge status={task.status} />
            </td>
            <td className="px-4 py-2.5">
              <div className="flex flex-wrap gap-1">
                {task.relations?.length === 0 && <span className="text-muted-foreground/30">—</span>}
                {task.relations?.map(l => (
                  <span key={l._id} className="inline-flex items-center gap-1.5 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-blue-500 text-[8px] font-bold text-white">{l.name.charAt(0).toUpperCase()}</span>
                    {l.name}
                  </span>
                ))}
              </div>
            </td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-500/20 text-[10px] font-bold text-orange-400">
                  {task.realtorId.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-muted-foreground">{task.realtorId.name}</span>
              </div>
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">
              {task.assigneeId ? (
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/20 text-[10px] font-bold text-purple-400">
                    {task.assigneeId.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{task.assigneeId.name}</span>
                </div>
              ) : "—"}
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">{timeAgo(task.createdAt)}</td>
          </tr>
        ))}

        {/* New Row Placeholder */}
        {showNewRow ? (
            <tr className="bg-white/[0.02] border-b border-white/[0.06]">
              <td className="px-4 py-2"></td>
              <td className="px-4 py-2">
                <Input
                  placeholder="Task title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  className="h-8 border-0 bg-white/[0.04] px-3 text-[13px] focus-visible:ring-1 focus-visible:ring-white/10"
                  autoFocus
                />
              </td>
              <td className="px-4 py-2" colSpan={6}>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleCreate} disabled={submitting} className="h-7 text-[11px]">Save</Button>
                  <button onClick={() => setShowNewRow(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan={8}>
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
  );
}

// ══════════════════════════════════════════════════════════════════════
// Kanban Board View Component
// ══════════════════════════════════════════════════════════════════════
function KanbanBoard({ tasks, onUpdate, onAdd, onTaskClick }: any) {
  
  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    onUpdate(taskId, { status });
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex h-full gap-4 p-5 overflow-x-auto">
      {TASK_STATUSES.map(status => (
        <div 
          key={status} 
          className="flex-shrink-0 w-72 flex flex-col gap-3"
          onDrop={(e) => handleDrop(e, status)}
          onDragOver={allowDrop}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground/60">{tasks.filter((t: any) => t.status === status).length}</span>
            </div>
          </div>
          
          {/* Column Items */}
          <div className="flex flex-col gap-2 min-h-[150px] bg-white/[0.01] rounded border border-dashed border-white/[0.05] p-1.5 pb-10">
            {tasks.filter((t: any) => t.status === status).map((task: Task) => (
              <div 
                key={task._id} 
                draggable
                onDragStart={(e) => e.dataTransfer.setData("taskId", task._id)}
                onClick={() => onTaskClick(task)}
                className="bg-white/[0.04] hover:bg-white/[0.06] transition-colors border border-white/[0.08] p-3 rounded shadow-sm cursor-grab active:cursor-grabbing flex flex-col gap-2"
              >
                <div className="font-medium text-foreground text-[13px]">{task.title || "Untitled"}</div>
                {task.relations?.length > 0 && (
                  <div className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {task.relations[0].name} {task.relations.length > 1 && `+${task.relations.length - 1}`}
                  </div>
                )}
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[10px] text-muted-foreground/40">{timeAgo(task.createdAt)}</div>
                  {task.assigneeId && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-400">
                      {task.assigneeId.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => onAdd(status)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground/50 hover:bg-white/[0.04] hover:text-muted-foreground rounded transition"
            >
              <Plus className="h-3 w-3" /> Add new
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Detail Panel Component
// ══════════════════════════════════════════════════════════════════════
function TaskDetailPanel({ task, leads, users, onClose, onUpdate, onDelete }: any) {
  const [activeTab, setActiveTab] = useState<"home" | "timeline" | "files">("home");

  const handleBlur = (field: string, val: string) => {
    onUpdate({ [field]: val });
  };

  return (
    <div className="flex w-[380px] shrink-0 flex-col border-l border-white/[0.06] bg-sidebar">
      {/* Panel header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
        <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <Input 
          className="border-0 bg-transparent px-0 font-medium text-foreground text-sm flex-1 shadow-none focus-visible:ring-0 focus-visible:border-b focus-visible:border-white/20 rounded-none h-auto py-1"
          defaultValue={task.title || "Untitled"}
          onBlur={(e) => handleBlur("title", e.target.value)}
        />
        <div className="flex items-center gap-1">
          <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-400 rounded hover:bg-white/[0.04]">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 text-[10px] text-muted-foreground/50">
        Created {timeAgo(task.createdAt)}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/[0.06] px-4">
        {["home", "timeline", "files"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t as any)}
            className={`pb-2.5 text-xs font-medium capitalize transition-colors ${
              activeTab === t ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
        {activeTab === "home" && (
          <>
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Fields</p>
              <div className="flex flex-col gap-4">
                
                {/* Status Inline Edit */}
                <div className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground flex items-center gap-1.5"><Check className="h-3 w-3 opacity-60"/>Status</div>
                  <Dropdown status={task.status} options={TASK_STATUSES} onSelect={(s) => onUpdate({ status: s })} />
                </div>

                {/* Due Date Inline Edit */}
                <div className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3 opacity-60"/>Due Date</div>
                  <Input 
                    type="date"
                    className="h-7 border-0 bg-white/[0.04] text-xs px-2 shadow-none flex-1 max-w-[150px]"
                    defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""}
                    onBlur={(e) => handleBlur("dueDate", e.target.value)}
                  />
                </div>

                {/* Assignee Inline Edit */}
                <div className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground flex items-center gap-1.5"><UserSquare2 className="h-3 w-3 opacity-60"/>Assignee</div>
                  <Dropdown 
                    status={task.assigneeId?.name || "Unassigned"} 
                    options={["Unassigned", ...users.map((u: User) => u.name)]} 
                    onSelect={(s) => {
                      if (s === "Unassigned") onUpdate({ assigneeId: null });
                      else onUpdate({ assigneeId: users.find((u: User) => u.name === s)?._id });
                    }} 
                    isCustom
                  />
                </div>
                
                {/* Relations list (read-only for brevity, updating relations generally uses advanced chip UI) */}
                <div className="flex items-start gap-3">
                  <div className="w-24 text-xs text-muted-foreground flex items-center gap-1.5 mt-1"><Users className="h-3 w-3 opacity-60"/>Relations</div>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {task.relations?.length === 0 && <span className="text-xs text-muted-foreground mt-1">—</span>}
                    {task.relations?.map((l: Lead) => (
                      <span key={l._id} className="inline-flex items-center gap-1.5 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Creator (Read-only) */}
                <div className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground flex items-center gap-1.5"><UserSquare2 className="h-3 w-3 opacity-60"/>Created by</div>
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <img src={`https://ui-avatars.com/api/?name=${task.realtorId.name}&background=random`} className="h-5 w-5 rounded-full" alt="" />
                    {task.realtorId.name}
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Note</p>
              <textarea
                className="w-full bg-transparent text-[13px] text-foreground resize-none border-0 p-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 min-h-[150px]"
                placeholder="Type your task note here..."
                defaultValue={task.body}
                onBlur={(e) => handleBlur("body", e.target.value)}
              />
            </div>
          </>
        )}
        {activeTab !== "home" && (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/40">
            {activeTab} coming soon
          </div>
        )}
      </div>

      {/* Panel footer */}
      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
        <div className="text-[10px] text-muted-foreground/50">Updated {timeAgo(task.updatedAt)}</div>
        <Button size="sm" className="h-7 gap-1.5 rounded-md px-4 text-xs">
          Open Full Object
        </Button>
      </div>
    </div>
  );
}

// ── Shared UI Utilities ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const style = getStatusStyle(status);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: style.dot }} />
      {status || "No Value"}
    </span>
  );
}

function Dropdown({ status, options, onSelect, isCustom }: { status: string, options: string[], onSelect: (val: string) => void, isCustom?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="focus:outline-none">
        {isCustom ? (
          <span className="text-xs text-foreground cursor-pointer hover:bg-white/[0.04] px-1.5 py-0.5 rounded">{status}</span>
        ) : (
          <StatusBadge status={status} />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-32 rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-1 shadow-xl">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); setOpen(false); }}
              className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground rounded"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
