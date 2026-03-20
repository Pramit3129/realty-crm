"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Loader2, Inbox, History, User, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, getToken } from "@/lib/auth";

interface Email {
  _id: string;
  leadId: {
    _id: string;
    name: string;
    email: string;
  };
  subject: string;
  body: string;
  senderEmail: string;
  receivedAt: string;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function InboxView() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const token = getToken();

  const checkIntegrationStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/emailIntegration/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.isConnected);
        return data.isConnected;
      }
    } catch {
      setIsConnected(false);
    }
    return false;
  }, [token]);

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/lead/emails`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      const connected = await checkIntegrationStatus();
      if (connected) {
        fetchEmails();
      } else {
        setLoading(false);
      }
    };
    init();
  }, [checkIntegrationStatus, fetchEmails]);

  const handleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/emailIntegration/google/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      console.error("Failed to get auth URL:", err);
    }
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  const openEmail = (email: Email) => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>${email.subject}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; background: #f9f9f9; }
              .card { background: white; padding: 40px; border-radius: 12px; shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #eee; }
              .header { border-bottom: 2px solid #f0f0f0; margin-bottom: 30px; padding-bottom: 20px; }
              .subject { font-size: 24px; font-weight: 800; color: #000; margin-bottom: 10px; }
              .meta { color: #666; font-size: 14px; display: flex; flex-direction: column; gap: 4px; }
              .label { font-weight: 600; color: #444; }
              .body-content { font-size: 15px; }
              hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <div class="subject">${email.subject || "(No Subject)"}</div>
                <div class="meta">
                  <div><span class="label">From:</span> ${email.senderEmail}</div>
                  <div><span class="label">Lead:</span> ${email.leadId?.name || "Unknown"} (${email.leadId?.email || ""})</div>
                  <div><span class="label">Received:</span> ${new Date(email.receivedAt).toLocaleString()}</div>
                </div>
              </div>
              <div class="body-content">${email.body}</div>
            </div>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Email Notifications</h1>
            <p className="text-xs text-muted-foreground/60">Manage all incoming lead communications</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchEmails} 
            disabled={loading}
            className="h-8 gap-2 border-white/[0.08] hover:bg-white/[0.04] text-[11px] font-bold uppercase tracking-wider min-w-[100px]"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <History className="h-3.5 w-3.5" />
            )}
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500/40 mb-4" />
              <p className="text-sm text-muted-foreground animate-pulse">Synchronizing your inbox...</p>
            </div>
          ) : !isConnected ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="max-w-[400px] w-full bg-background rounded-xl border border-border p-10 space-y-6 animate-in fade-in duration-500">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight">Connect your Gmail</h2>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed">
                    Access your professional inbox directly within the CRM to manage lead communications.
                  </p>
                </div>

                <Button 
                  onClick={handleConnect}
                  size="lg"
                  className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium rounded-md shadow-sm gap-2"
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
                
                <p className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-widest">
                  Official Google OAuth2 Integration
                </p>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center rounded-2xl border-2 border-dashed border-white/[0.04] bg-white/[0.01]">
              <div className="h-16 w-16 rounded-full bg-white/[0.02] flex items-center justify-center mb-6">
                <Mail className="h-8 w-8 text-muted-foreground/20" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/80">No new notifications</h3>
              <p className="text-sm text-muted-foreground/40 mt-2 max-w-xs">
                When leads reply to your emails or send new inquiries, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {emails.map((email) => (
                <div
                  key={email._id}
                  onClick={() => openEmail(email)}
                  className="group relative flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground truncate">
                          {email.leadId?.name || "Unknown Lead"}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-white/10" />
                        <span className="text-[11px] text-muted-foreground/40 font-medium">
                          {email.senderEmail}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {timeAgo(email.receivedAt)}
                      </span>
                    </div>
                    
                    <h4 className="text-[13px] font-semibold text-foreground/90 mb-1 group-hover:text-blue-400 transition-colors">
                      {email.subject || "(No Subject)"}
                    </h4>
                    
                    <p 
                      className="text-[12px] text-muted-foreground/60 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: email.body?.replace(/<[^>]*>?/gm, ' ') }}
                    />
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-5 right-5">
                    <ExternalLink className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}} />
    </div>
  );
}
