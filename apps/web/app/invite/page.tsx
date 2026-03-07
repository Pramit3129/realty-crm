"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invite token provided.");
      setLoading(false);
      return;
    }

    const authToken = getToken();
    if (!authToken) {
      // If not logged in, they need to log in first and then come back.
      // Save intended destination
      sessionStorage.setItem("postLoginRedirect", `/invite?token=${token}`);
      router.push("/");
      return;
    }

    // Rather than auto-joining, we show the confirmation prompt
    setLoading(false);
    setPendingConfirm(true);
  }, [token, router]);

  async function joinWorkspace() {
    setPendingConfirm(false);
    setLoading(true);
    const authToken = getToken();
    
    try {
      const res = await fetch(`${API_BASE_URL}/memberships/join/${token}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        // Clear any possible pending redirect to avoid loops
        sessionStorage.removeItem("postLoginRedirect");
        setTimeout(() => {
          router.push("/dashboard?view=members");
        }, 2000);
      } else {
        setError(data.message || "Failed to join workspace. Link may be invalid or expired.");
      }
    } catch (e) {
      setError("Network error joining workspace.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-muted-foreground">Joining workspace...</p>
      </div>
    );
  }

  if (pendingConfirm) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">i</div>
        <h2 className="text-xl font-semibold mb-2">Workspace Invitation</h2>
        <p className="text-muted-foreground mb-6">You have been invited to join a workspace. Do you want to join?</p>
        <div className="flex gap-4 w-full">
          <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>Decline</Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={joinWorkspace}>Accept Invite</Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">!</div>
        <h2 className="text-xl font-semibold mb-2">Invite Failed</h2>
        <p className="text-muted-foreground text-center mb-6">{error}</p>
        <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">✓</div>
        <h2 className="text-xl font-semibold mb-2">Successfully Joined!</h2>
        <p className="text-muted-foreground mb-6">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return null;
}

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white/[0.02] border border-white/[0.08] rounded-2xl shadow-xl">
        <Suspense fallback={<p className="text-center text-muted-foreground">Loading...</p>}>
          <InviteContent />
        </Suspense>
      </div>
    </div>
  );
}
