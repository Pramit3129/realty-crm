"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  FileText,
  RefreshCw,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Activity,
  MousePointerClick,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { ContentLoader } from "@/components/ui/content-loader";

interface AnalyticsViewProps {
  workspaceId: string;
}

interface Interaction {
  label: string;
  eventType: string;
  tagName: string;
  href: string;
  count: number;
  percent: number;
}

interface DashboardStats {
  totalSessions: number;
  uniqueVisitors: number;
  avgPagesPerSession: number;
  engagementHeatScore: { hot: number; warm: number; cool: number; new: number };
  clickHotspots: Interaction[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
}

interface LeadEngagement {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  totalEvents: number;
  lastSeen: string;
  buttonTexts: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────
function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

function eventLabel(type: string): string {
  if (type === "page_view") return "Page";
  if (type === "click") return "Click";
  if (type === "form_submit") return "Form";
  return type;
}

function eventColor(type: string): string {
  if (type === "page_view") return "#10b981";
  if (type === "click") return "#8b5cf6";
  if (type === "form_submit") return "#f59e0b";
  return "#64748b";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Returns a stable hue (0-360) from a string */
function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

const BAR_PALETTE = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const RANK_STYLES = [
  { bg: "bg-amber-400/10", text: "text-amber-500", label: "01" },
  { bg: "bg-slate-400/10", text: "text-slate-400", label: "02" },
  { bg: "bg-orange-400/10", text: "text-orange-400", label: "03" },
];

// ══════════════════════════════════════════════════════════════════════
// AnalyticsView
// ══════════════════════════════════════════════════════════════════════
export default function AnalyticsView({ workspaceId }: AnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<LeadEngagement[]>([]);
  const [error, setError] = useState("");

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!workspaceId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const [statsRes, leadsRes] = await Promise.all([
          api(`/trackers/workspace/${workspaceId}/dashboard-stats`),
          api(`/trackers/workspace/${workspaceId}/lead-engagement`),
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        } else {
          setError("Failed to load analytics");
        }

        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(data.leads ?? []);
        }
      } catch {
        setError("Network error loading analytics");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return <ContentLoader loading={true} text="Loading analytics..." />;
  }

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground/60">
          {error || "No analytics data"}
        </p>
      </div>
    );
  }

  const heat = stats.engagementHeatScore;
  const device = stats.deviceBreakdown;

  return (
    <div className="flex-1 h-full flex flex-col bg-background overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Analytics</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="h-7 gap-1.5 rounded-md px-3 text-xs"
        >
          {refreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </Button>
      </div>

      {/* Sub-header */}
      <div className="flex items-center gap-2 border-b border-border/30 px-5 py-1.5">
        <span className="text-xs text-muted-foreground">
          Overview · {formatNumber(stats.totalSessions)} total events
        </span>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 max-w-5xl mx-auto w-full">
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        {/* ── Stat cards row ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Sessions
              </span>
              <Activity className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatNumber(stats.totalSessions)}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Total engagement
            </p>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Unique Visitors
              </span>
              <Eye className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatNumber(stats.uniqueVisitors)}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Anonymous visitors
            </p>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Avg. Pages / Session
              </span>
              <FileText className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {stats.avgPagesPerSession}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Pages per visitor
            </p>
          </div>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Lead Leaderboard ────────────────────────────── */}
          <section className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Lead Engagement
              </h2>
              <span className="text-[10px] font-bold text-muted-foreground/70">
                {leads.length} leads
              </span>
            </div>

            <div className="divide-y divide-border/20">
              {leads.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No identified leads yet
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Once visitors are identified, they'll appear here ranked by
                    activity
                  </p>
                </div>
              ) : (
                leads.map((lead, idx) => {
                  const hue = stringToHue(lead.email || lead.name);
                  const initials = lead.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join("");
                  const rank = RANK_STYLES[idx] ?? null;

                  return (
                    <div
                      key={lead.leadId}
                      className="px-5 py-3.5 flex items-start gap-3.5 hover:bg-muted/40 transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black text-white mt-0.5"
                        style={{
                          background: `hsl(${hue}, 55%, 50%)`,
                        }}
                      >
                        {initials || "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {/* Rank badge for top 3 */}
                            {rank && (
                              <span
                                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums shrink-0 ${rank.bg} ${rank.text}`}
                              >
                                {rank.label}
                              </span>
                            )}
                            {!rank && (
                              <span className="text-[10px] font-bold text-muted-foreground/40 tabular-nums shrink-0 w-4">
                                {idx + 1}
                              </span>
                            )}
                            <span className="text-[13px] font-semibold text-foreground truncate">
                              {lead.name}
                            </span>
                          </div>

                          {/* Event count pill */}
                          <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-muted px-2 py-1">
                            <span className="text-[11px] font-black text-foreground tabular-nums">
                              {lead.totalEvents}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              events
                            </span>
                          </div>
                        </div>

                        {/* Email + last seen */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] text-muted-foreground truncate">
                            {lead.email}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40 shrink-0">
                            · {timeAgo(lead.lastSeen)}
                          </span>
                        </div>

                        {/* Phone + City */}
                        {(lead.phone || lead.city) && (
                          <div className="flex items-center gap-3 mb-2">
                            {lead.phone && (
                              <span className="text-[10px] text-muted-foreground/70">
                                Phone: {lead.phone}
                              </span>
                            )}
                            {lead.city && (
                              <span className="text-[10px] text-muted-foreground/70">
                                City: {lead.city}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Button text tags */}
                        {lead.buttonTexts.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {lead.buttonTexts.map((btn, bi) => (
                              <Badge
                                key={bi}
                                variant="secondary"
                                className="text-[9px] font-semibold px-1.5 py-0 h-4 rounded bg-muted/70 text-muted-foreground border-0 hover:bg-muted"
                              >
                                {btn}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* ── Right column ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Engagement heat score */}
            <section className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border/30 pb-3">
                Engagement Heat Score
              </h2>

              <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
                {heat.hot > 0 && (
                  <div
                    className="transition-all duration-700"
                    style={{
                      width: `${heat.hot}%`,
                      backgroundColor: "#ef4444",
                    }}
                  />
                )}
                {heat.warm > 0 && (
                  <div
                    className="transition-all duration-700"
                    style={{
                      width: `${heat.warm}%`,
                      backgroundColor: "#f59e0b",
                    }}
                  />
                )}
                {heat.cool > 0 && (
                  <div
                    className="transition-all duration-700"
                    style={{
                      width: `${heat.cool}%`,
                      backgroundColor: "#3b82f6",
                    }}
                  />
                )}
                {heat.new > 0 && (
                  <div
                    className="transition-all duration-700"
                    style={{
                      width: `${heat.new}%`,
                      backgroundColor: "#10b981",
                    }}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Hot", value: heat.hot, color: "#ef4444" },
                  { label: "Warm", value: heat.warm, color: "#f59e0b" },
                  { label: "Cool", value: heat.cool, color: "#3b82f6" },
                  { label: "New", value: heat.new, color: "#10b981" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-xs font-bold text-foreground ml-auto tabular-nums">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Device breakdown */}
            <section className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border/30 pb-3">
                Device Breakdown
              </h2>

              <div className="space-y-3">
                {[
                  {
                    icon: Monitor,
                    label: "Desktop",
                    value: device.desktop,
                    color: "#3b82f6",
                  },
                  {
                    icon: Smartphone,
                    label: "Mobile",
                    value: device.mobile,
                    color: "#8b5cf6",
                  },
                  {
                    icon: Tablet,
                    label: "Tablet",
                    value: device.tablet,
                    color: "#10b981",
                  },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <d.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-foreground">
                          {d.label}
                        </span>
                        <span className="text-xs font-bold text-foreground tabular-nums">
                          {d.value}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${d.value}%`,
                            backgroundColor: d.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {device.desktop === 0 &&
                  device.mobile === 0 &&
                  device.tablet === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center pt-2">
                      Device data will appear after new events arrive.
                    </p>
                  )}
              </div>
            </section>
          </div>
        </div>

        {/* ── Top Interactions (full-width below) ───────────────────── */}
        <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Top Interactions
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground/70">
              {stats.clickHotspots.length} items
            </span>
          </div>

          <div className="divide-y divide-border/20">
            {stats.clickHotspots.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <MousePointerClick className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No interaction data yet
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Page views, clicks, and form submissions will appear here
                </p>
              </div>
            ) : (
              stats.clickHotspots.map((item, idx) => (
                <div
                  key={idx}
                  className="px-6 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-[11px] font-bold text-muted-foreground/60 w-5 text-right tabular-nums shrink-0">
                    {idx + 1}
                  </span>

                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      color: eventColor(item.eventType),
                      backgroundColor: eventColor(item.eventType) + "22",
                    }}
                  >
                    {eventLabel(item.eventType)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {item.label}
                      </span>
                      <span className="text-xs font-bold text-foreground/80 tabular-nums shrink-0 ml-3">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor:
                            BAR_PALETTE[idx % BAR_PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.2); }
      `,
        }}
      />
    </div>
  );
}
