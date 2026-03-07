"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, getToken } from "@/lib/auth";

interface Member {
  _id: string;
  user: { _id: string; name: string; email: string };
  role: string;
}

export default function MembersView({ workspaceId, userRole }: { workspaceId: string; userRole: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const token = getToken();

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch(`${API_BASE_URL}/memberships/workspace/${workspaceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
        }
      } catch (e) {
        console.error("Failed to fetch members", e);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [workspaceId, token]);

  const generateLink = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/memberships/invite/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Assuming the app runs on window.location.origin
        const link = `${window.location.origin}/invite?token=${data.token}`;
        setInviteLink(link);
      } else {
        alert("Only workspace owners can generate invite links.");
      }
    } catch {
      alert("Error generating link.");
    }
  };

  const copyToClipboard = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground overflow-y-auto">
      <div className="px-8 py-6 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-8">Workspace / Members</h1>

        {/* Invite Section */}
        {userRole === "OWNER" && (
          <div className="mb-10 p-6 rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <h2 className="text-lg font-medium mb-2">Invite by link</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Share this link to invite users to join your workspace
            </p>

            <div className="flex items-center gap-3">
              {inviteLink ? (
                <div className="flex-1 flex items-center bg-black/40 px-3 py-2 rounded-md border border-white/[0.08] overflow-hidden">
                  <span className="text-sm text-white/70 truncate flex-1">{inviteLink}</span>
                </div>
              ) : (
                <Button onClick={generateLink} variant="outline" className="border-white/[0.08] hover:bg-white/[0.04]">
                  Generate Link
                </Button>
              )}

              {inviteLink && (
                <Button onClick={copyToClipboard} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Copied
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" /> Copy link
                    </>
                  ) }
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Members List */}
        <div>
          <h2 className="text-lg font-medium mb-4">Members</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading members...</p>
          ) : (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] border-b border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-3 font-medium text-muted-foreground">User</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {members.map((m) => (
                    <tr key={m._id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
                            {m.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{m.user.name}</div>
                            <div className="text-xs text-muted-foreground">{m.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.role === "OWNER" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {m.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">
                        No members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
