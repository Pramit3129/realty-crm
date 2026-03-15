"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Camera,
  Upload,
  Trash2,
  FileText,
  ChevronRight,
  X,
  Loader2,
  Briefcase,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getToken, API_BASE_URL, clearToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface SettingsViewProps {
  workspace: any;
  onClose: () => void;
}

const CANADA_CITIES = [
  "Toronto",
  "Vancouver",
  "Montreal",
  "Calgary",
  "Edmonton",
  "Ottawa",
  "Winnipeg",
  "Quebec City",
  "Hamilton",
  "Kitchener",
  "London",
  "Victoria",
  "Halifax",
  "Oshawa",
  "Windsor",
];

export default function SettingsView({ onClose }: SettingsViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadField, setCurrentUploadField] = useState<string | null>(
    null,
  );
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [initialUserData, setInitialUserData] = useState<any>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    businessName: "",
    licenseNumber: "",
    phoneNumber: "",
    address: "",
    professionalEmail: "",
    yearsInBusiness: 0,
    calendlyLink: "",
    markets: [] as string[],
    signatureImageUrl: "",
    brandLogoUrl: "",
    brokerageLogoUrl: "",
    brokerageName: "",
    subscriptionPlan: "free",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${API_BASE_URL}/user/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        const user = data.user;
        setInitialUserData(user);
        setFormData({
          firstName: user.firstName || user.name?.split(" ")[0] || "",
          lastName: user.lastName || user.name?.split(" ")[1] || "",
          email: user.email || "",
          businessName: user.businessName || "",
          licenseNumber: user.licenseNumber || "",
          phoneNumber: user.phoneNumber || "",
          address: user.address || "",
          professionalEmail: user.professionalEmail || "",
          yearsInBusiness: user.yearsInBusiness || 0,
          calendlyLink: user.calendlyLink || "",
          markets: user.markets || [],
          signatureImageUrl: user.signatureImageUrl || "",
          brandLogoUrl: user.brandLogoUrl || "",
          brokerageLogoUrl: user.brokerageLogoUrl || "",
          brokerageName: user.brokerageName || "",
          subscriptionPlan: user.subscriptionPlan || "free",
        });
      } catch (err) {
        console.error("Fetch profile error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (showSuccess) setShowSuccess(false);
  };

  const handleMarketToggle = (city: string) => {
    setFormData((prev) => ({
      ...prev,
      markets: prev.markets.includes(city)
        ? prev.markets.filter((c) => c !== city)
        : [...prev.markets, city],
    }));
    if (showSuccess) setShowSuccess(false);
  };

  const triggerUpload = (field: string) => {
    setCurrentUploadField(field);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadField) return;

    setUploadingField(currentUploadField);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setFormData((prev) => ({ ...prev, [currentUploadField]: data.url }));
      if (showSuccess) setShowSuccess(false);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingField(null);
      setCurrentUploadField(null);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
        }),
      });

      if (!res.ok) throw new Error("Update failed");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Update profile error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    )
      return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error("Deletion failed");

      clearToken();
      router.push("/");
    } catch (err) {
      console.error("Delete account error:", err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0A0A0A] overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="max-w-3xl w-full mx-auto px-6 py-8 flex items-center justify-between border-b border-border/20 sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground/60">
          User <span className="text-muted-foreground/30">/</span>{" "}
          <span className="text-foreground">Profile</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" /> Exit Settings
        </button>
      </div>

      <main className="max-w-3xl w-full mx-auto p-12 py-16 space-y-12 relative">
        {showSuccess && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-full text-[11px] font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300 z-20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Profile successfully
            updated
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Profile Settings
          </h1>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold hover:bg-accent/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={saving}
              className="h-9 px-8 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95 shadow-xl shadow-foreground/10"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-12">
          {/* Identity Section */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 border-b border-border/10 pb-2">
              Direct Identity
            </h2>

            <div className="flex items-center gap-6 pb-2">
              <div className="h-20 w-20 rounded-2xl bg-accent/5 border border-border/10 flex items-center justify-center overflow-hidden group">
                {formData.brandLogoUrl ? (
                  <img 
                    src={formData.brandLogoUrl} 
                    className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-500" 
                  />
                ) : initialUserData?.avatarUrl ? (
                  <img 
                    src={initialUserData.avatarUrl} 
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-500" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground/10" />
                )}
                {/* Fallback if the image above was hidden by onError */}
                {!formData.brandLogoUrl && initialUserData?.avatarUrl && (
                  <Camera className="h-8 w-8 text-muted-foreground/10 absolute z-[-1]" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerUpload("brandLogoUrl")}
                    className="h-8 text-[11px] font-bold bg-background/5 border-border/40 hover:bg-background/10 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Update Avatar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormData((p) => ({ ...p, brandLogoUrl: "" }))
                    }
                    className="h-8 text-[11px] font-bold bg-background/5 border-border/40 hover:bg-background/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/40 italic">
                  Square PNG, JPEG or GIF under 10MB
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder={initialUserData?.firstName || "First Name"}
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder={initialUserData?.lastName || "Last Name"}
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder={initialUserData?.phoneNumber || "Phone Number"}
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  Account Email (Private)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    value={formData.email}
                    disabled
                    className="h-10 pl-10 bg-accent/2 border-border/5 text-muted-foreground/30 cursor-not-allowed text-sm font-medium"
                  />
                  <Lock className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/20" />
                </div>
              </div>
            </div>
          </section>

          {/* Business Section */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 border-b border-border/10 pb-2">
              Business Metadata
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  Entity Name
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder={initialUserData?.businessName || "Entity Name"}
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  License ID
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    placeholder={initialUserData?.licenseNumber || "License ID"}
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  Public Professional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="professionalEmail"
                    value={formData.professionalEmail}
                    onChange={handleInputChange}
                    placeholder={initialUserData?.professionalEmail || "Email"}
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  Headquarters Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder={
                      initialUserData?.address || "Headquarters Address"
                    }
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  Industry Tenure (Years)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="yearsInBusiness"
                    type="number"
                    value={formData.yearsInBusiness}
                    onChange={handleInputChange}
                    placeholder={String(initialUserData?.yearsInBusiness || 0)}
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 ml-0.5">
                  Calendly Scheduling
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/20" />
                  <Input
                    name="calendlyLink"
                    value={formData.calendlyLink}
                    onChange={handleInputChange}
                    placeholder={
                      initialUserData?.calendlyLink ||
                      "https://calendly.com/..."
                    }
                    className="h-10 pl-10 bg-accent/5 border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Brokerage Section */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 border-b border-border/10 pb-2">
              Brokerage Info
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 ml-0.5">
                  Brokerage Name
                </label>
                <Input
                  name="brokerageName"
                  value={formData.brokerageName}
                  onChange={handleInputChange}
                  placeholder={
                    initialUserData?.brokerageName || "Brokerage Name"
                  }
                  className="h-10 bg-accent/5 border-border/20 focus-visible:ring-1 text-sm"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 ml-1 block">
                  Brokerage Logo
                </label>
                <div
                  className="h-24 rounded-xl border-2 border-dashed border-border/20 bg-accent/5 flex flex-col items-center justify-center p-2 relative overflow-hidden group hover:border-border/40 transition-colors cursor-pointer"
                  onClick={() => triggerUpload("brokerageLogoUrl")}
                >
                  {formData.brokerageLogoUrl ? (
                    <img
                      src={formData.brokerageLogoUrl}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 ml-1 block">
                  Signature Image
                </label>
                <div
                  className="h-24 rounded-xl border-2 border-dashed border-border/20 bg-accent/5 flex flex-col items-center justify-center p-2 relative overflow-hidden group hover:border-border/40 transition-colors cursor-pointer"
                  onClick={() => triggerUpload("signatureImageUrl")}
                >
                  {formData.signatureImageUrl ? (
                    <img
                      src={formData.signatureImageUrl}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <FileText className="h-6 w-6 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Markets Section */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 border-b border-border/10 pb-2">
              Active Target Markets
            </h2>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {CANADA_CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => handleMarketToggle(city)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                    formData.markets.includes(city)
                      ? "bg-foreground text-background border-foreground shadow-lg shadow-foreground/10"
                      : "bg-accent/5 text-muted-foreground/60 border-border/10 hover:border-border/30 hover:text-foreground",
                  )}
                >
                  {city}
                </button>
              ))}
            </div>
          </section>

          {/* Account Tier */}
          <section className="space-y-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 border-b border-border/10 pb-2">
              Plan Details
            </h2>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-accent/10 to-transparent border border-border/10 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center border border-border/10">
                  <ShieldCheck className="h-5 w-5 text-foreground/40" />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-tight">
                    {formData.subscriptionPlan} Tier
                  </h4>
                  <p className="text-[10px] text-muted-foreground/40 font-medium">
                    Billed annually • Next cycle in 243 days
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-black uppercase tracking-widest bg-transparent border-border/20 hover:bg-foreground/5 group-hover:border-foreground/20 transition-all"
              >
                Upgrade <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="pt-12 border-t border-border/20 space-y-4 pb-24">
            <div>
              <h3 className="text-sm font-black text-foreground/90 uppercase tracking-widest">
                Termination Zone
              </h3>
              <p className="text-[11px] text-muted-foreground/40 italic">
                Permanently delete account and all associated realtor metadata
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="h-10 px-8 text-[11px] font-black uppercase tracking-[0.2em] bg-destructive/5 text-destructive border-destructive/10 hover:bg-destructive/10 hover:border-destructive/40 rounded-xl transition-all active:scale-95"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Deactivate Profile"
              )}
            </Button>
          </section>
        </div>
      </main>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*"
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `,
        }}
      />
    </div>
  );
}
