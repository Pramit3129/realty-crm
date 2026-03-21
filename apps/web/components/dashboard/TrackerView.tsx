"use client";

import { useState, useEffect, useCallback } from "react";
import { Radar, Globe, Copy, Check, RefreshCw, Loader2, Code2, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { API_BASE_URL, getToken } from "@/lib/auth";
import { ContentLoader } from "@/components/ui/content-loader";
import { cn } from "@/lib/utils";

interface TrackerViewProps {
  workspaceId: string;
  userRole?: string;
}

export default function TrackerView({ workspaceId, userRole = "AGENT" }: TrackerViewProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [domain, setDomain] = useState("");
  const [trackerScript, setTrackerScript] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const isOwner = userRole === "OWNER";

  const fetchTrackerDetails = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/trackers/workspace/${workspaceId}/tracker-details`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey || "");
        setDomain(data.domain || "");
        setTrackerScript(data.trackerScript);
      } else {
        const data = await res.json();
        if (res.status === 404 && data.message.includes("API key not found")) {
            // This is expected if they haven't generated one yet
            setApiKey("");
            setTrackerScript(null);
        } else {
            setError(data.message || "Failed to fetch tracker details");
        }
      }
    } catch {
      setError("Network error fetching tracker details");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTrackerDetails();
  }, [fetchTrackerDetails]);

  const handleGenerateKey = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/trackers/generate-api-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          workspaceId,
          domain: domain.trim() || undefined,
        }),
      });

      if (res.ok) {
        await fetchTrackerDetails();
      } else {
        const data = await res.json();
        // Specific handling for new error states
        if (res.status === 403) throw new Error("ONLY_OWNER_CAN_SET_DOMAIN");
        if (res.status === 409) throw new Error("DOMAIN_ALREADY_IN_USE");
        if (res.status === 400 && data.message.includes("owner has not configured")) throw new Error("DOMAIN_NOT_CONFIGURED_BY_OWNER");
        
        setError(data.message || "Failed to generate API key");
      }
    } catch (err: any) {
      if (err.message === "ONLY_OWNER_CAN_SET_DOMAIN") setError("Only workspace owners can configure the domain.");
      else if (err.message === "DOMAIN_ALREADY_IN_USE") setError("This domain is already registered to another workspace.");
      else if (err.message === "DOMAIN_NOT_CONFIGURED_BY_OWNER") setError("Please ask your workspace owner to configure the domain first.");
      else setError("Network error generating API key");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!trackerScript) return;
    navigator.clipboard.writeText(trackerScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <ContentLoader loading={true} text="Loading tracker settings..." />;
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto px-6 py-8 flex items-center justify-between border-b border-border/20 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground/60">
          Workspace <span className="text-muted-foreground/30">/</span>{" "}
          <span className="text-foreground font-bold">Tracker Setup</span>
        </div>
        <div className="flex items-center gap-4">
           {apiKey && (
              <div className="px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest">Tracking Active</span>
              </div>
           )}
        </div>
      </div>

      <main className="max-w-4xl w-full mx-auto p-12 py-16 space-y-12 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Website Tracker</h1>
            <p className="text-sm text-muted-foreground/60">Monitor visitor activity and identify new leads across your domain</p>
          </div>
          <div className="flex gap-3">
             <Button 
                onClick={handleGenerateKey}
                disabled={generating}
                className="h-9 px-8 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95 border-b-2 border-foreground/20"
             >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : apiKey ? (
                   <><RefreshCw className="h-3.5 w-3.5 mr-2" /> Regenerate Key</>
                ) : (
                   "Initialize Tracker"
                )}
             </Button>
          </div>
        </div>
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-12">
          {/* Configuration Card */}
          <section className="space-y-6 bg-card/30 border border-border/40 p-6 rounded-xl shadow-sm backdrop-blur-[2px]">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 border-b border-border/10 pb-3 mb-2">
              Tracker Configuration
            </h2>

            <div className="space-y-8">
              <div className="space-y-3">
                 <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-0.5">
                    Authorized Target Domain
                 </Label>
                 <div className="relative group">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20 group-focus-within:text-foreground/40 transition-colors" />
                    <Input 
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="e.g. analytics.realtycrm.com"
                        className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium transition-all shadow-inner"
                    />
                 </div>
                 <div className="flex items-start gap-2 px-1">
                    <Info className="h-3 w-3 text-muted-foreground/30 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground/40 italic leading-relaxed">
                       Security Note: Changing the authorized domain will invalidate your current API key and generate a new one for that specific context.
                    </p>
                 </div>
              </div>

              {apiKey && (
                 <div className="space-y-3 pt-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-0.5">
                       Active Tracking Identity
                    </Label>
                    <div className="flex items-center gap-2 p-1.5 pl-4 rounded-lg bg-accent/5 border border-border/10 shadow-inner">
                        <code className="flex-1 font-mono text-sm tracking-tight text-foreground/70">{apiKey}</code>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(apiKey);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="h-8 w-8 p-0 hover:bg-foreground/5 rounded-md transition-colors"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                 </div>
              )}
            </div>
          </section>

          {/* Installation Script */}
          {trackerScript ? (
            <section className="space-y-6 bg-card/30 border border-border/40 p-6 rounded-xl shadow-sm backdrop-blur-[2px] animate-in slide-in-from-bottom-8 duration-700">
               <div className="flex items-center justify-between border-b border-border/10 pb-3 mb-2">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                    Integration Payload
                  </h2>
                  <Button 
                    variant="link" 
                    onClick={copyToClipboard}
                    className="h-4 p-0 text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors"
                  >
                    {copied ? "Copied" : "Copy full script"}
                  </Button>
               </div>

               <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-start gap-3 shadow-inner">
                     <Radar className="h-4 w-4 text-amber-500/50 shrink-0 mt-0.5" />
                     <p className="text-[11px] text-amber-200/50 leading-relaxed italic">
                        Deployment Instructions: Inject this script into the <span className="font-bold text-foreground/40 underline">&lt;head&gt;</span> of your target website. Once deployed, tracking will propagate within 1-2 minutes.
                     </p>
                  </div>

                  <div className="relative group">
                    <pre className="p-6 rounded-xl bg-black/40 border border-border/10 overflow-x-auto text-[12px] font-mono leading-relaxed text-foreground/50 custom-scrollbar select-all group-hover:bg-black/50 transition-colors shadow-inner">
                      {trackerScript}
                    </pre>
                    <div className="absolute top-4 right-4 flex gap-2">
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={copyToClipboard}
                         className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background/50 border-border/20 backdrop-blur-md hover:bg-background/80 transition-all opacity-0 group-hover:opacity-100 rounded-md"
                       >
                         {copied ? <Check className="h-3 w-3 mr-1.5" /> : <Copy className="h-3 w-3 mr-1.5" />}
                         Copy
                       </Button>
                    </div>
                  </div>
               </div>
            </section>
          ) : (
            <div className="p-16 rounded-xl border-2 border-dashed border-border/20 bg-accent/2 flex flex-col items-center justify-center text-center space-y-4">
               <div className="h-16 w-16 rounded-xl bg-accent/5 flex items-center justify-center border border-border/10">
                  <Code2 className="h-8 w-8 text-muted-foreground/10" />
               </div>
               <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Awaiting Initialization</h3>
                  <p className="text-[11px] text-muted-foreground/40 max-w-[240px] italic">Set your domain and generate an identity key to receive your website connection script</p>
               </div>
            </div>
          )}
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
