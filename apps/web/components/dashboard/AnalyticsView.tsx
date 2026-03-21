"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Eye,
  FileText,
  RefreshCw,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Flame,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, getToken } from "@/lib/auth";
import { ContentLoader } from "@/components/ui/content-loader";
import { cn } from "@/lib/utils";

interface AnalyticsViewProps {
  workspaceId: string;
}

interface LiveVisitor {
  id: string;
  label: string;
  device: "Desktop" | "Mobile" | "Tablet";
  pages: string[];
  heat: "Hot" | "Warm" | "Cool" | "New";
  minutesAgo: number;
  isLive: boolean;
}

interface DashboardStats {
  totalSessions: number;
  uniqueVisitors: number;
  avgPagesPerSession: number;
  engagementHeatScore: { hot: number; warm: number; cool: number; new: number };
  liveVisitors: LiveVisitor[];
  liveVisitorCount: number;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
}

const HEAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Hot: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" },
  Warm: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
  Cool: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-500" },
  New: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" },
};

const DEVICE_ICONS: Record<string, any> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

export default function AnalyticsView({ workspaceId }: AnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  const fetchStats = useCallback(
    async (isRefresh = false) => {
      if (!workspaceId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/trackers/workspace/${workspaceId}/dashboard-stats`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setError("Failed to load analytics");
        }
      } catch {
        setError("Network error loading analytics");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  const heatScore = stats.engagementHeatScore;
  const device = stats.deviceBreakdown;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto px-6 py-8 flex items-center justify-between border-b border-border/20 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground/60">
          Workspace <span className="text-muted-foreground/30">/</span>{" "}
          <span className="text-foreground font-bold">Analytics</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Refresh
        </Button>
      </div>

      <main className="max-w-6xl w-full mx-auto p-6 lg:p-12 py-8 lg:py-16 space-y-8">
        {/* ── Error Banner ─────────────────────────── */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* ── Stat Cards Row ──────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Sessions"
            sublabel="Total engagement"
            value={formatNumber(stats.totalSessions)}
            icon={<Activity className="h-4 w-4" />}
            accent="emerald"
          />
          <StatCard
            label="Unique Visitors"
            sublabel="Anonymous visitors"
            value={formatNumber(stats.uniqueVisitors)}
            icon={<Eye className="h-4 w-4" />}
            accent="violet"
          />
          <StatCard
            label="Avg. Pages / Session"
            sublabel="Pages per visitor"
            value={String(stats.avgPagesPerSession)}
            icon={<FileText className="h-4 w-4" />}
            accent="blue"
          />
        </div>

        {/* ── Main Grid: Live Visitors + Right Column ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Live Visitor Sessions */}
          <div className="lg:col-span-3">
            <Card className="border-border/40 bg-card/30 backdrop-blur-[2px] shadow-sm">
              <CardContent className="p-0">
                {/* Card header */}
                <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-border/10">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                      Live Visitor Sessions — Right Now
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground/60">
                      {stats.liveVisitorCount} active now
                    </span>
                  </div>
                </div>

                {/* Visitor list */}
                <div className="divide-y divide-border/5">
                  {stats.liveVisitors.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/15 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground/40 font-medium">
                        No active visitors in the last 15 minutes
                      </p>
                      <p className="text-[11px] text-muted-foreground/30 mt-1">
                        Visitors will appear here when page_view events are tracked
                      </p>
                    </div>
                  ) : (
                    stats.liveVisitors.map((visitor) => {
                      const DeviceIcon = DEVICE_ICONS[visitor.device] || Monitor;
                      const heatStyle = HEAT_COLORS[visitor.heat] || HEAT_COLORS.New;
                      return (
                        <div
                          key={visitor.id}
                          className="px-6 py-3.5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Device icon */}
                          <div className="mt-0.5 h-8 w-8 rounded-lg bg-accent/5 border border-border/10 flex items-center justify-center shrink-0">
                            <DeviceIcon className="h-4 w-4 text-muted-foreground/40" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground/80 truncate">
                                {visitor.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground/40">
                                · {visitor.device}
                              </span>
                            </div>
                            {/* Pages visited as tags */}
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {visitor.pages.map((page, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent/5 border border-border/10 text-muted-foreground/60 truncate max-w-[140px]"
                                >
                                  {page}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Heat + time */}
                          <div className="flex items-center gap-2 shrink-0 mt-0.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                heatStyle.bg,
                                heatStyle.text
                              )}
                            >
                              {visitor.heat}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap">
                              {visitor.isLive ? (
                                <span className="text-emerald-400 font-bold">Live</span>
                              ) : (
                                `${visitor.minutesAgo}m ago`
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Engagement Heat Score */}
            <Card className="border-border/40 bg-card/30 backdrop-blur-[2px] shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 border-b border-border/10 pb-3">
                  Engagement Heat Score
                </h2>

                {/* Segmented bar */}
                <div className="h-3 rounded-full overflow-hidden flex bg-accent/5 border border-border/10">
                  {heatScore.hot > 0 && (
                    <div
                      className="bg-red-500 transition-all duration-700"
                      style={{ width: `${heatScore.hot}%` }}
                    />
                  )}
                  {heatScore.warm > 0 && (
                    <div
                      className="bg-amber-500 transition-all duration-700"
                      style={{ width: `${heatScore.warm}%` }}
                    />
                  )}
                  {heatScore.cool > 0 && (
                    <div
                      className="bg-blue-500 transition-all duration-700"
                      style={{ width: `${heatScore.cool}%` }}
                    />
                  )}
                  {heatScore.new > 0 && (
                    <div
                      className="bg-emerald-500 transition-all duration-700"
                      style={{ width: `${heatScore.new}%` }}
                    />
                  )}
                </div>

                {/* Labels */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold">
                  <span className="text-red-400">
                    Hot {heatScore.hot}%
                  </span>
                  <span className="text-amber-400">
                    Warm {heatScore.warm}%
                  </span>
                  <span className="text-blue-400">
                    Cool {heatScore.cool}%
                  </span>
                  <span className="text-emerald-400">
                    New {heatScore.new}%
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground/40 italic leading-relaxed">
                  Heat score based on pages visited, time on site, listing saves,
                  and form interactions — no login needed.
                </p>
              </CardContent>
            </Card>

            {/* Device Breakdown */}
            <Card className="border-border/40 bg-card/30 backdrop-blur-[2px] shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 border-b border-border/10 pb-3">
                  Device Breakdown
                </h2>

                <div className="space-y-3.5">
                  <DeviceBar
                    icon={<Monitor className="h-4 w-4" />}
                    label="Desktop"
                    percent={device.desktop}
                    color="bg-blue-500"
                  />
                  <DeviceBar
                    icon={<Smartphone className="h-4 w-4" />}
                    label="Mobile"
                    percent={device.mobile}
                    color="bg-violet-500"
                  />
                  <DeviceBar
                    icon={<Tablet className="h-4 w-4" />}
                    label="Tablet"
                    percent={device.tablet}
                    color="bg-emerald-500"
                  />
                </div>

                {device.desktop === 0 && device.mobile === 0 && device.tablet === 0 && (
                  <p className="text-[10px] text-muted-foreground/40 italic text-center pt-2">
                    Device data will appear after the tracker script is updated and new events arrive.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `,
        }}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({
  label,
  sublabel,
  value,
  icon,
  accent,
}: {
  label: string;
  sublabel: string;
  value: string;
  icon: React.ReactNode;
  accent: "emerald" | "violet" | "blue";
}) {
  const accentMap = {
    emerald: "border-emerald-500/20 bg-emerald-500/[0.03]",
    violet: "border-violet-500/20 bg-violet-500/[0.03]",
    blue: "border-blue-500/20 bg-blue-500/[0.03]",
  };

  const iconAccentMap = {
    emerald: "text-emerald-500/50",
    violet: "text-violet-500/50",
    blue: "text-blue-500/50",
  };

  return (
    <Card
      className={cn(
        "border shadow-sm backdrop-blur-[2px] transition-all hover:shadow-md",
        accentMap[accent]
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            {label}
          </span>
          <span className={cn("opacity-60", iconAccentMap[accent])}>{icon}</span>
        </div>
        <div className="text-3xl font-black tracking-tight text-foreground">
          {value}
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-1">
          {sublabel}
        </p>
      </CardContent>
    </Card>
  );
}

function DeviceBar({
  icon,
  label,
  percent,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-md bg-accent/5 border border-border/10 flex items-center justify-center text-muted-foreground/40 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground/70">
            {label}
          </span>
          <span className="text-xs font-bold text-foreground/80">
            {percent}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-accent/5 border border-border/10 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", color)}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}
