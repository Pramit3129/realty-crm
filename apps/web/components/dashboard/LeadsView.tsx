"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  X,
  Mail,
  Phone,
  Globe,
  Clock,
  Tag,
  ChevronDown,
  Check,
  Upload,
  Download,
  Trash2,
  CheckSquare,
  User,
  Send,
  History,
  Loader2,
  MessageSquare,
  CheckCircle,
  Circle,
  UserPlus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Settings2,
  Tags as TagsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTokenPayload } from "@/lib/auth";
import { api } from "@/lib/api";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ContentLoader } from "@/components/ui/content-loader";
import TagsManager, { type TagDef, hexToRgba } from "./TagsManager";

// ── Types ─────────────────────────────────────────────────────────────
interface Pipeline {
  _id: string;
  name: string;
  type: string;
}

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  city?: string;
  status: string;
  pipelineId?: string;
  stageId?: {
    _id: string;
    name: string;
    colorIndex: number;
  };
  realtorId?: {
    _id: string;
    name: string;
    email: string;
  };
  extra_fields?: Record<string, string>;
  tags?: TagDef[];
  createdAt: string;
  updatedAt: string;
}

interface LeadsViewProps {
  workspaceId: string;
  userRole?: string;
}

const getRealtorId = (lead: Lead) => {
  if (!lead.realtorId) return "";
  return typeof lead.realtorId === "string"
    ? lead.realtorId
    : lead.realtorId._id;
};

// ── Constants ─────────────────────────────────────────────────────────
// Status styles are now dynamic — colors are generated from the status string hash
const STATUS_COLOR_PALETTE = [
  { bg: "rgba(59,130,246,0.18)", text: "#60a5fa", dot: "#3b82f6" }, // blue
  { bg: "rgba(245,158,11,0.18)", text: "#fbbf24", dot: "#f59e0b" }, // amber
  { bg: "rgba(16,185,129,0.18)", text: "#34d399", dot: "#10b981" }, // emerald
  { bg: "rgba(139,92,246,0.18)", text: "#a78bfa", dot: "#8b5cf6" }, // violet
  { bg: "rgba(236,72,153,0.18)", text: "#f472b6", dot: "#ec4899" }, // pink
  { bg: "rgba(6,182,212,0.18)", text: "#22d3ee", dot: "#06b6d4" }, // cyan
  { bg: "rgba(249,115,22,0.18)", text: "#fb923c", dot: "#f97316" }, // orange
  { bg: "rgba(168,85,247,0.18)", text: "#c084fc", dot: "#a855f7" }, // purple
  { bg: "rgba(34,197,94,0.18)", text: "#4ade80", dot: "#22c55e" }, // green
  { bg: "rgba(239,68,68,0.18)", text: "#f87171", dot: "#ef4444" }, // red
  { bg: "rgba(20,184,166,0.18)", text: "#2dd4bf", dot: "#14b8a6" }, // teal
  { bg: "rgba(99,102,241,0.18)", text: "#818cf8", dot: "#6366f1" }, // indigo
  { bg: "rgba(132,204,22,0.18)", text: "#a3e635", dot: "#84cc16" }, // lime
  { bg: "rgba(244,63,94,0.18)", text: "#fb7185", dot: "#f43f5e" }, // rose
  { bg: "rgba(14,165,233,0.18)", text: "#38bdf8", dot: "#0ea5e9" }, // sky
  { bg: "rgba(217,70,239,0.18)", text: "#e879f9", dot: "#d946ef" }, // fuchsia
  { bg: "rgba(234,179,8,0.18)", text: "#fde047", dot: "#eab708" }, // yellow
  { bg: "rgba(100,116,139,0.18)", text: "#94a3b8", dot: "#64748b" }, // slate
  { bg: "rgba(120,113,108,0.18)", text: "#a8a29e", dot: "#78716c" }, // stone
  { bg: "rgba(63,63,70,0.18)", text: "#a1a1aa", dot: "#3f3f46" }, // zinc
];

// Map stages directly if they match default pipeline stages, otherwise fallback to hash
const DEFAULT_STAGE_INDEXES: Record<string, number> = {
  // Buyer
  "new inquiry": 0,
  contacted: 1,
  qualified: 2,
  "active search": 3,
  "showing scheduled": 4,
  "offer preparing": 5,
  "offer submitted": 6,
  "under contract": 7, // Shared
  "closed won": 8, // Shared
  lost: 9, // Shared
  // Seller
  "consultation scheduled": 1, // Skip 0 since it's "New Inquiry"
  "listing agreement signed": 2,
  "property live": 3,
  "offer received": 4,
};

function getStatusStyle(status: string, colorIndex?: number) {
  if (colorIndex !== undefined && colorIndex !== null && colorIndex >= 0) {
    return STATUS_COLOR_PALETTE[colorIndex % STATUS_COLOR_PALETTE.length];
  }

  if (!status)
    return { bg: "rgba(255,255,255,0.1)", text: "#999", dot: "#666" };

  const normalized = status.toLowerCase();

  // If it's a known default stage, use its exact position color
  if (normalized in DEFAULT_STAGE_INDEXES) {
    return STATUS_COLOR_PALETTE[DEFAULT_STAGE_INDEXES[normalized]];
  }

  let hash = 0;
  for (let i = 0; i < status.length; i++) {
    hash = status.charCodeAt(i) + ((hash << 5) - hash);
  }
  return STATUS_COLOR_PALETTE[Math.abs(hash) % STATUS_COLOR_PALETTE.length];
}

const DEFAULT_STATUS_STYLE = {
  bg: "rgba(255,255,255,0.1)",
  text: "#999",
  dot: "#666",
};

const COUNTRY_CODES = [
  { code: "+1",   label: "US",  id: "US" },
  { code: "+1",   label: "CA",  id: "CA" },
  { code: "+44",  label: "UK",  id: "UK" },
  { code: "+91",  label: "IN",  id: "IN" },
  { code: "+61",  label: "AU",  id: "AU" },
  { code: "+49",  label: "DE",  id: "DE" },
  { code: "+33",  label: "FR",  id: "FR" },
  { code: "+81",  label: "JP",  id: "JP" },
  { code: "+86",  label: "CN",  id: "CN" },
  { code: "+971", label: "AE",  id: "AE" },
  { code: "+65",  label: "SG",  id: "SG" },
  { code: "+55",  label: "BR",  id: "BR" },
  { code: "+52",  label: "MX",  id: "MX" },
  { code: "+27",  label: "ZA",  id: "ZA" },
  { code: "+82",  label: "KR",  id: "KR" },
  { code: "+39",  label: "IT",  id: "IT" },
];

const COMMON_TITLES = ["Mr.", "Mrs.", "Ms.", "Miss", "Mx.", "Dr.", "Prof.", "Rev.", "Capt.", "Sir", "Lady", "Hon."];

const SOURCE_MAX_LEN = 50;

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  "US":  ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","San Jose","Austin","San Francisco","Seattle","Denver","Nashville","Miami","Atlanta","Minneapolis","Portland","Las Vegas"],
  "CA":  [
    // Ontario
    "Toronto","Ottawa","Mississauga","Brampton","Hamilton","London","Markham","Vaughan","Kitchener","Windsor","Richmond Hill","Oakville","Burlington","Oshawa","Barrie","Guelph","Kingston","Thunder Bay","Sudbury","St. Catharines",
    // British Columbia
    "Vancouver","Surrey","Burnaby","Richmond","Kelowna","Abbotsford","Coquitlam","Langley","Victoria","Nanaimo","Kamloops","Prince George","Chilliwack","Delta",
    // Quebec
    "Montreal","Quebec City","Laval","Longueuil","Sherbrooke","Saguenay","Lévis","Gatineau","Trois-Rivières","Terrebonne",
    // Alberta
    "Calgary","Edmonton","Red Deer","Lethbridge","Airdrie","Medicine Hat","Grande Prairie","Spruce Grove","Fort McMurray","Beaumont",
    // Manitoba
    "Winnipeg","Brandon","Steinbach","Winkler","Portage la Prairie","Thompson",
    // Saskatchewan
    "Saskatoon","Regina","Prince Albert","Moose Jaw","Swift Current","Yorkton",
    // Nova Scotia
    "Halifax","Dartmouth","Sydney","Truro","New Glasgow",
    // New Brunswick
    "Moncton","Saint John","Fredericton","Miramichi","Bathurst",
    // Newfoundland & Labrador
    "St. John's","Corner Brook","Gander","Grand Falls-Windsor",
    // Prince Edward Island
    "Charlottetown","Summerside",
    // Northwest Territories
    "Yellowknife","Hay River",
    // Yukon
    "Whitehorse","Dawson City",
    // Nunavut
    "Iqaluit","Rankin Inlet"
  ],
  "UK":  ["London","Birmingham","Manchester","Leeds","Glasgow","Liverpool","Sheffield","Bristol","Edinburgh","Cardiff","Newcastle","Leicester","Nottingham","Southampton","Belfast"],
  "IN":  ["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad","Jaipur","Surat","Lucknow","Kanpur","Nagpur","Indore","Bhopal","Visakhapatnam","Patna","Vadodara","Gurgaon","Noida"],
  "AU":  ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Canberra","Gold Coast","Newcastle","Wollongong","Hobart","Geelong","Townsville","Cairns","Darwin"],
  "DE":  ["Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Düsseldorf","Leipzig","Dortmund","Essen","Bremen","Dresden","Hanover","Nuremberg"],
  "FR":  ["Paris","Lyon","Marseille","Toulouse","Nice","Nantes","Strasbourg","Montpellier","Bordeaux","Lille","Rennes","Reims","Le Havre","Saint-Étienne"],
  "JP":  ["Tokyo","Yokohama","Osaka","Nagoya","Sapporo","Fukuoka","Kobe","Kyoto","Kawasaki","Saitama","Hiroshima","Sendai","Chiba"],
  "CN":  ["Shanghai","Beijing","Shenzhen","Guangzhou","Chengdu","Tianjin","Chongqing","Wuhan","Xi'an","Hangzhou","Nanjing","Dongguan","Foshan"],
  "AE":  ["Dubai","Abu Dhabi","Sharjah","Ajman","Ras Al Khaimah","Fujairah","Umm Al Quwain"],
  "SG":  ["Singapore"],
  "BR":  ["São Paulo","Rio de Janeiro","Brasília","Salvador","Fortaleza","Belo Horizonte","Manaus","Curitiba","Recife","Porto Alegre","Belém","Goiânia"],
  "MX":  ["Mexico City","Guadalajara","Monterrey","Puebla","Tijuana","Cancún","Mérida","León","Querétaro","San Luis Potosí"],
  "ZA":  ["Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein","East London","Nelspruit","Polokwane"],
  "KR":  ["Seoul","Busan","Incheon","Daegu","Daejeon","Gwangju","Suwon","Ulsan","Changwon","Goyang"],
  "IT":  ["Rome","Milan","Naples","Turin","Palermo","Genoa","Bologna","Florence","Bari","Catania","Venice","Verona"],
};

// ── Phone formatting ──────────────────────────────────────────────────
const PHONE_FORMATS: Record<string, { maxDigits: number; mask: (d: string) => string }> = {
  "+1":  { maxDigits: 10, mask: (d) => { if (!d) return ""; const p1=d.slice(0,3),p2=d.slice(3,6),p3=d.slice(6,10); if(d.length<=3)return `(${p1}`; if(d.length<=6)return `(${p1}) ${p2}`; return `(${p1}) ${p2}-${p3}`; } },
  "+44": { maxDigits: 10, mask: (d) => { if (!d) return ""; const p1=d.slice(0,4),p2=d.slice(4,10); return d.length<=4?p1:`${p1} ${p2}`; } },
  "+91": { maxDigits: 10, mask: (d) => { if (!d) return ""; const p1=d.slice(0,5),p2=d.slice(5,10); return d.length<=5?p1:`${p1} ${p2}`; } },
  "+61": { maxDigits: 9,  mask: (d) => { if (!d) return ""; const p1=d.slice(0,4),p2=d.slice(4,7),p3=d.slice(7,9); if(d.length<=4)return p1; if(d.length<=7)return `${p1} ${p2}`; return `${p1} ${p2} ${p3}`; } },
  "+65": { maxDigits: 8,  mask: (d) => { if (!d) return ""; const p1=d.slice(0,4),p2=d.slice(4,8); return d.length<=4?p1:`${p1} ${p2}`; } },
  "+33": { maxDigits: 9,  mask: (d) => { if (!d) return ""; return [d.slice(0,1),d.slice(1,3),d.slice(3,5),d.slice(5,7),d.slice(7,9)].filter(Boolean).join(" "); } },
  "+49": { maxDigits: 11, mask: (d) => d },
  "+81": { maxDigits: 10, mask: (d) => d },
  "+86": { maxDigits: 11, mask: (d) => d },
  "+971":{ maxDigits: 9,  mask: (d) => d },
  "+55": { maxDigits: 11, mask: (d) => d },
  "+52": { maxDigits: 10, mask: (d) => d },
  "+27": { maxDigits: 9,  mask: (d) => d },
  "+82": { maxDigits: 10, mask: (d) => d },
  "+39": { maxDigits: 10, mask: (d) => d },
};

const PHONE_PLACEHOLDERS: Record<string, string> = {
  "+1":  "(555) 555-5555",
  "+44": "7911 123456",
  "+91": "98765 43210",
  "+61": "0412 345 67",
  "+65": "9123 4567",
  "+33": "6 12 34 56 78",
};

function formatPhoneDigits(digits: string, code: string): string {
  return PHONE_FORMATS[code]?.mask(digits) ?? digits;
}

function getMaxPhoneDigits(code: string): number {
  return PHONE_FORMATS[code]?.maxDigits ?? 15;
}

function stripPhoneFormatting(phone: string): string {
  return phone.replace(/\D/g, "");
}

function parseStoredPhone(fullPhone: string): { code: string; digits: string } {
  for (const cc of COUNTRY_CODES) {
    if (fullPhone.startsWith(cc.code + " ")) {
      return { code: cc.code, digits: fullPhone.slice(cc.code.length + 1).replace(/\D/g, "") };
    }
  }
  return { code: "+1", digits: fullPhone.replace(/\D/g, "") };
}

// ── Helpers ───────────────────────────────────────────────────────────
export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `about ${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `about ${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `about ${months} month${months > 1 ? "s" : ""} ago`;
}

// ── Name parsing ──────────────────────────────────────────────────────
// Stored `name` is a single string. Client-side we split it into
// title / firstName / lastName for display + structured input, and
// re-join when persisting back.
const KNOWN_TITLES = new Set([
  "mr", "mrs", "ms", "miss", "mx", "dr", "prof",
  "sir", "madam", "mdm", "rev", "fr", "br",
  "capt", "maj", "lt", "col", "gen", "hon",
  "lord", "lady",
]);

export function parseName(full: string | undefined | null): {
  title: string;
  firstName: string;
  lastName: string;
} {
  const trimmed = (full || "").trim();
  if (!trimmed) return { title: "", firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  const head = parts[0].replace(/\.$/, "").toLowerCase();
  let title = "";
  let rest = parts;
  if (KNOWN_TITLES.has(head) && parts.length > 1) {
    title = parts[0].replace(/\.$/, "");
    rest = parts.slice(1);
  }
  const firstName = rest[0] || "";
  const lastName = rest.slice(1).join(" ");
  return { title, firstName, lastName };
}

export function joinName(
  title: string,
  firstName: string,
  lastName: string,
): string {
  const t = title.trim();
  const titlePart = t ? (t.endsWith(".") ? t : `${t}.`) : "";
  return [titlePart, firstName.trim(), lastName.trim()]
    .filter(Boolean)
    .join(" ");
}

const TABLE_COLUMNS = [
  { key: "title", label: "Title", icon: Users },
  { key: "firstName", label: "First Name", icon: Users },
  { key: "lastName", label: "Last Name", icon: Users },
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "source", label: "Source", icon: Globe },
  { key: "status", label: "Status", icon: Tag },
  { key: "tags", label: "Tags", icon: TagsIcon },
  { key: "realtor", label: "Agent", icon: Users },
  { key: "createdAt", label: "Created", icon: Clock },
];

// ══════════════════════════════════════════════════════════════════════
// LeadsView
// ══════════════════════════════════════════════════════════════════════
export default function LeadsView({
  workspaceId,
  userRole = "AGENT",
}: LeadsViewProps) {
  const isOwner = userRole?.toUpperCase() === "OWNER";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set(),
  );
  const [showNewForm, setShowNewForm] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // inline editing
  const [editingCell, setEditingCell] = useState<{
    leadId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // search + filters (client-side)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // tags
  const [tags, setTags] = useState<TagDef[]>([]);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [showAssignTagMenu, setShowAssignTagMenu] = useState(false);
  const [assigningTag, setAssigningTag] = useState(false);

  // new-lead form
  const [newTitle, setNewTitle] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("+1");
  const [newCountryId, setNewCountryId] = useState("CA");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newSource, setNewSource] = useState("");
  const [formError, setFormError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [members, setMembers] = useState<
    { _id: string; name: string; role: "OWNER" | "AGENT" }[]
  >([]);

  const tokenPayload = getTokenPayload();
  const currentUserId =
    tokenPayload?.id || tokenPayload?._id || tokenPayload?.sub || "";
  // ── Fetch leads ───────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const url = activeTagId
        ? `/lead/workspace/${workspaceId}?tagId=${activeTagId}`
        : `/lead/workspace/${workspaceId}`;
      const res = await api(url);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [workspaceId, activeTagId]);

  const fetchTags = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await api("/tag/list", {
        headers: { "x-workspace-id": workspaceId },
      });
      if (res.ok) setTags(await res.json());
    } catch {
      /* silent */
    }
  }, [workspaceId]);

  const fetchPipelines = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await api(`/pipeline/workspace/${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setPipelines(data || []);
      }
    } catch {
      /* silent */
    }
  }, [workspaceId]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api("/user/me");
      if (res.ok) {
        const data = await res.json();
        // The API might return user directly or inside an object
        const user = data.user || data;
        setCurrentUser(user);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchPipelines();
    fetchCurrentUser();
    fetchTags();
  }, [fetchLeads, fetchPipelines, fetchCurrentUser, fetchTags]);

  useEffect(() => {
    if (!workspaceId || !isOwner) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/memberships/workspace/${workspaceId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const mapped = (data || [])
          .filter((m: any) => m?.user)
          .map((m: any) => ({
            _id: m.user._id,
            name: m.user.name,
            role: m.role as "OWNER" | "AGENT",
          }));
        setMembers(mapped);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, isOwner]);

  async function reassignLeadOwner(leadId: string, newOwnerId: string) {
    try {
      const res = await api(`/lead/details/${leadId}/owner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.lead) {
        setLeads((prev) =>
          prev.map((l) => (l._id === leadId ? data.lead : l)),
        );
        setSelectedLead((prev) =>
          prev && prev._id === leadId ? data.lead : prev,
        );
      } else {
        fetchLeads();
      }
      return true;
    } catch {
      return false;
    }
  }

  // Keep selected lead in sync after refetch
  useEffect(() => {
    if (selectedLead) {
      const updated = leads.find((l) => l._id === selectedLead._id);
      if (updated) setSelectedLead(updated);
    }
  }, [leads]);

  const uniqueStatuses = useMemo(
    () =>
      Array.from(
        new Set(leads.map((l) => l.status).filter((v): v is string => !!v)),
      ).sort(),
    [leads],
  );
  const uniqueSources = useMemo(
    () =>
      Array.from(
        new Set(leads.map((l) => l.source).filter((v): v is string => !!v)),
      ).sort(),
    [leads],
  );
  const uniqueCities = useMemo(
    () =>
      Array.from(
        new Set(
          leads.map((l) => l.city).filter((v): v is string => !!v && !!v.trim()),
        ),
      ).sort(),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
      if (cityFilter !== "all" && (lead.city || "") !== cityFilter) return false;
      if (!q) return true;
      const haystack = [
        lead.name,
        lead.email,
        lead.phone,
        lead.city,
        lead.source,
        lead.status,
        lead.realtorId?.name,
        lead.realtorId?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, searchQuery, statusFilter, sourceFilter, cityFilter]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (cityFilter !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setCityFilter("all");
  };

  // ── Create lead ───────────────────────────────────────────────────
  function isValidEmail(email: string) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleCreate() {
    if (!newFirstName.trim()) {
      setFormError("First name is required");
      return;
    }
    const extractEmail = (input: string) => {
      const match = input.match(/<(.+)>$/);
      return match ? match[1] : input.trim();
    };
    const cleanEmail = extractEmail(newEmail);
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      setEmailError("Invalid email address");
      return;
    }

    setSubmitting(true);
    try {
      const fullPhone = newPhone.trim()
        ? `${newCountryCode} ${stripPhoneFormatting(newPhone)}`
        : "";
      const fullName = joinName(newTitle, newFirstName, newLastName);
      const res = await api("/lead/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName,
          email: extractEmail(newEmail),
          phone: fullPhone,
          city: newCity.trim(),
          source: newSource.trim() || "manual",
          workspaceId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || "Failed to create lead");
        return;
      }
      setNewTitle("");
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setEmailError("");
      setNewCountryCode("+1");
      setNewCountryId("CA");
      setNewPhone("");
      setNewCity("");
      setNewSource("");
      setShowNewForm(false);
      fetchLeads();
    } catch {
      setFormError("Network error");
    } finally {
      // Small delay for better UX
      setTimeout(() => setSubmitting(false), 500);
    }
  }

  async function handleDeletePipeline(pipelineId: string) {
    try {
      const res = await api(`/pipeline/details/${pipelineId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPipelines();
        fetchLeads();
      } else {
        const body = await res.json();
        alert(body.message || "Failed to delete pipeline.");
      }
    } catch {
      alert("Failed to delete pipeline.");
    }
  }

  // ── Inline update ─────────────────────────────────────────────────
  async function saveInlineEdit(leadId: string, field: string, value: string) {
    setEditingCell(null);
    try {
      let finalField = field;
      let finalValue = value;
      if (field === "email") {
        const match = value.match(/<(.+)>$/);
        finalValue = match ? match[1] : value.trim();
      }
      // Title / first name / last name are virtual — they're stored as a
      // single `name` string. Splice the new value into the parsed parts
      // and persist as `name`.
      if (field === "title" || field === "firstName" || field === "lastName") {
        const lead = leads.find((l) => l._id === leadId);
        const parsed = parseName(lead?.name || "");
        const next = { ...parsed, [field]: value };
        finalField = "name";
        finalValue = joinName(next.title, next.firstName, next.lastName);
      }

      const res = await api(`/lead/details/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [finalField]: finalValue }),
      });
      if (res.ok) fetchLeads();
    } catch {
      /* silent */
    }
  }

  function startEditing(leadId: string, field: string, currentValue: string) {
    setEditingCell({ leadId, field });
    setEditValue(currentValue);
  }

  // ── Row click ─────────────────────────────────────────────────────
  function handleRowClick(lead: Lead) {
    setSelectedLead(selectedLead?._id === lead._id ? null : lead);
  }

  // ── Selection & Bulk Ops ──────────────────────────────────────────
  function toggleAll() {
    const visibleIds = filteredLeads.map((l) => l._id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedLeadIds.has(id));
    if (allVisibleSelected) {
      const next = new Set(selectedLeadIds);
      visibleIds.forEach((id) => next.delete(id));
      setSelectedLeadIds(next);
    } else {
      const next = new Set(selectedLeadIds);
      visibleIds.forEach((id) => next.add(id));
      setSelectedLeadIds(next);
    }
  }

  function toggleLead(id: string) {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  }

  async function handleBulkAssignTag(tagId: string) {
    if (selectedLeadIds.size === 0) return;
    setAssigningTag(true);
    try {
      const res = await api("/lead/assign-tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeadIds),
          tagId,
        }),
      });
      if (res.ok) {
        setShowAssignTagMenu(false);
        setSelectedLeadIds(new Set());
        fetchLeads();
      }
    } finally {
      setAssigningTag(false);
    }
  }

  async function handleBulkDelete() {
    if (
      !confirm(`Are you sure you want to delete ${selectedLeadIds.size} leads?`)
    )
      return;

    setSubmitting(true);
    try {
      // Create a sequential delete queue
      for (const id of selectedLeadIds) {
        await api(`/lead/details/${id}`, {
          method: "DELETE",
        });
      }
      setSelectedLeadIds(new Set());
      fetchLeads();
    } catch {
      alert("Failed to delete some leads.");
    } finally {
      setTimeout(() => setSubmitting(false), 500);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* ── Main table area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-background min-w-0">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-2.5 gap-3 sm:gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold text-foreground">Leads</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedLeadIds.size > 0 && (
              <AssignTagButton
                tags={tags}
                open={showAssignTagMenu}
                onOpen={() => setShowAssignTagMenu(true)}
                onClose={() => setShowAssignTagMenu(false)}
                onAssign={handleBulkAssignTag}
                count={selectedLeadIds.size}
                loading={assigningTag}
              />
            )}
            {selectedLeadIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={submitting}
                className="h-7 gap-1.5 rounded-md px-3 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>Delete Selected ({selectedLeadIds.size})</>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTagsManager(true)}
              className="h-7 gap-1.5 rounded-md px-3 text-xs border-white/[0.08] hover:bg-white/[0.04]"
            >
              <TagsIcon className="h-3 w-3" />
              <span className="hidden xs:inline">Tags</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBatchModal(true)}
              className="h-7 gap-1.5 rounded-md px-3 text-xs border-white/[0.08] hover:bg-white/[0.04]"
            >
              <Upload className="h-3 w-3" />
              <span className="hidden xs:inline">Batch Record Add</span>
              <span className="xs:hidden">Batch</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowNewForm(true)}
              className="h-7 gap-1.5 rounded-md px-3 text-xs"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden xs:inline">New record</span>
              <span className="xs:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Sub-header: count + search + filters */}
        <div className="flex flex-col gap-2 border-b border-white/[0.06] px-5 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">
              {searchQuery || activeFilterCount > 0
                ? `Showing ${filteredLeads.length} of ${leads.length}`
                : `All Leads · ${leads.length}`}
            </span>

            <div className="relative ml-auto flex-1 min-w-[180px] max-w-[320px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, phone, city..."
                className="h-7 w-full rounded-md border border-white/[0.08] bg-white/[0.04] pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-white/[0.16] focus:bg-white/[0.06]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-white/[0.08] hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters((v) => !v)}
              className={`h-7 gap-1.5 rounded-md px-2.5 text-xs border-white/[0.08] hover:bg-white/[0.04] ${
                showFilters ? "bg-white/[0.04]" : ""
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500/20 px-1 text-[10px] font-bold text-blue-400">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {(searchQuery || activeFilterCount > 0) && (
              <button
                onClick={clearAllFilters}
                className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={uniqueStatuses}
              />
              <FilterSelect
                label="Source"
                value={sourceFilter}
                onChange={setSourceFilter}
                options={uniqueSources}
              />
              <FilterSelect
                label="City"
                value={cityFilter}
                onChange={setCityFilter}
                options={uniqueCities}
              />
            </div>
          )}

          {tags.length > 0 && (
            <TagPillBar
              tags={tags}
              activeTagId={activeTagId}
              onSelect={(id) => setActiveTagId(id)}
              onManage={() => setShowTagsManager(true)}
            />
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-white/10 sm:scrollbar-none">
          <table className="w-full min-w-[1200px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500"
                    checked={
                      filteredLeads.length > 0 &&
                      filteredLeads.every((l) => selectedLeadIds.has(l._id))
                    }
                    onChange={toggleAll}
                  />
                </th>
                {TABLE_COLUMNS.filter(
                  (col) => col.key !== "realtor" || isOwner,
                ).map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-xs font-medium text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <col.icon className="h-3 w-3" />
                      {col.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Loading State */}
              {loading && (
                <tr>
                  <td colSpan={(isOwner ? TABLE_COLUMNS.length : TABLE_COLUMNS.length - 1) + 1} className="py-12">
                    <ContentLoader loading={loading} text="Fetching leads..." />
                  </td>
                </tr>
              )}

              {/* ── Existing leads ────────────────────────────────── */}
              {filteredLeads.map((lead) => {
                const isOwnLead =
                  lead.realtorId?._id === currentUserId || !lead.realtorId;
                const canEdit = isOwnLead || userRole !== "OWNER"; // AGENT cannot see others anyway, OWNER can only edit own leads

                return (
                  <tr
                    key={lead._id}
                    onClick={(e) => {
                      // Prevent row click if clicking checkbox or editable cells
                      if (
                        (e.target as HTMLElement).tagName.toLowerCase() ===
                        "input"
                      )
                        return;
                      handleRowClick(lead);
                    }}
                    className={`cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                      selectedLead?._id === lead._id ? "bg-white/[0.05]" : ""
                    } ${selectedLeadIds.has(lead._id) ? "bg-blue-500/[0.02]" : ""}`}
                  >
                    {/* Select */}
                    <td className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded appearance-none border border-gray-400 bg-transparent checked:bg-blue-500"
                        checked={selectedLeadIds.has(lead._id)}
                        onChange={() => toggleLead(lead._id)}
                      />
                    </td>

                    {/* Title / First / Last (split from stored `name`) */}
                    {(() => {
                      const parsed = parseName(lead.name);
                      const cell = (
                        field: "title" | "firstName" | "lastName",
                      ) => {
                        const value = parsed[field];
                        const isEditing =
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === field;
                        return (
                          <td className="px-4 py-2.5" key={field}>
                            <EditableTextCell
                              value={value}
                              editing={isEditing}
                              editValue={editValue}
                              onStart={() =>
                                canEdit &&
                                startEditing(lead._id, field, value)
                              }
                              onChange={setEditValue}
                              onSave={(v) => saveInlineEdit(lead._id, field, v)}
                              onCancel={() => setEditingCell(null)}
                              canEdit={canEdit}
                            />
                          </td>
                        );
                      };
                      return (
                        <>
                          {cell("title")}
                          {cell("firstName")}
                          {cell("lastName")}
                        </>
                      );
                    })()}

                    {/* Email */}
                    <td className="px-4 py-2.5">
                      <EditableChipCell
                        value={lead.email}
                        editing={
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === "email"
                        }
                        editValue={editValue}
                        onStart={() =>
                          canEdit && startEditing(lead._id, "email", lead.email)
                        }
                        onChange={setEditValue}
                        onSave={(v) => saveInlineEdit(lead._id, "email", v)}
                        onCancel={() => setEditingCell(null)}
                        canEdit={canEdit}
                      />
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-2.5">
                      <EditableChipCell
                        value={(() => {
                          if (!lead.phone) return "";
                          const { code, digits } = parseStoredPhone(lead.phone);
                          return digits ? `${code} ${formatPhoneDigits(digits, code)}` : lead.phone;
                        })()}
                        editing={
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === "phone"
                        }
                        editValue={editValue}
                        onStart={() =>
                          canEdit && startEditing(lead._id, "phone", lead.phone)
                        }
                        onChange={setEditValue}
                        onSave={(v) => saveInlineEdit(lead._id, "phone", v)}
                        onCancel={() => setEditingCell(null)}
                        canEdit={canEdit}
                      />
                    </td>

                    {/* Source */}
                    <td className="px-4 py-2.5">
                      <EditableTextCell
                        value={lead.source}
                        displayValue={lead.source?.length > 28 ? lead.source.slice(0, 28) + "…" : lead.source}
                        editing={
                          canEdit &&
                          editingCell?.leadId === lead._id &&
                          editingCell?.field === "source"
                        }
                        editValue={editValue}
                        onStart={() =>
                          canEdit &&
                          startEditing(lead._id, "source", lead.source)
                        }
                        onChange={setEditValue}
                        onSave={(v) => saveInlineEdit(lead._id, "source", v)}
                        onCancel={() => setEditingCell(null)}
                        canEdit={canEdit}
                      />
                    </td>

                    {/* Status */}
                    <td
                      className="px-4 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isOwner && getRealtorId(lead) !== currentUserId ? (
                        <span className="text-muted-foreground/30 text-[12px]">
                          —
                        </span>
                      ) : (
                        <StatusDropdown
                          status={lead.status}
                          colorIndex={lead.stageId?.colorIndex}
                          onChange={
                            canEdit
                              ? (s) => saveInlineEdit(lead._id, "status", s)
                              : undefined
                          }
                          disabled={!canEdit}
                        />
                      )}
                    </td>

                    {/* Tags */}
                    <td
                      className="px-4 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TagsCell
                        tags={lead.tags || []}
                        leadId={lead._id}
                        workspaceId={workspaceId}
                        canEdit={canEdit}
                        onChanged={fetchLeads}
                      />
                    </td>

                    {/* Realtor/Agent (Show only to OWNER) */}
                    {isOwner && (
                      <td className="px-4 py-2.5">
                        {lead.realtorId ? (
                          <div className="flex items-center gap-1.5 tooltip-trigger">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-[12px] truncate max-w-[80px]">
                              {lead.realtorId.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[12px]">
                            Unknown
                          </span>
                        )}
                      </td>
                    )}

                    {/* Created At */}
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                      {timeAgo(lead.createdAt)}
                    </td>
                  </tr>
                );
              })}

              {/* ── "+ Add New" row — appears BELOW existing rows ─── */}
              <tr>
                <td colSpan={(isOwner ? TABLE_COLUMNS.length : TABLE_COLUMNS.length - 1) + 1}>
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-muted-foreground/60 transition-colors hover:bg-white/[0.02] hover:text-muted-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    Add New record
                  </button>
                </td>
              </tr>

              {/* No filter matches */}
              {!loading &&
                leads.length > 0 &&
                filteredLeads.length === 0 && (
                  <tr>
                    <td
                      colSpan={(isOwner ? TABLE_COLUMNS.length : TABLE_COLUMNS.length - 1) + 1}
                      className="px-4 py-10 text-center"
                    >
                      <p className="text-sm text-muted-foreground">
                        No leads match your filters
                      </p>
                      <button
                        onClick={clearAllFilters}
                        className="mt-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300 underline-offset-2 hover:underline"
                      >
                        Clear search & filters
                      </button>
                    </td>
                  </tr>
                )}

              {/* Empty state */}
              {!loading && leads.length === 0 && !showNewForm && (
                <tr>
                  <td colSpan={(isOwner ? TABLE_COLUMNS.length : TABLE_COLUMNS.length - 1) + 1} className="px-4 py-16 text-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground/60">
                          Fetching leads...
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          No leads yet
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/60">
                          Click "+ New record" to add your first lead.
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {formError && (
            <p className="px-5 py-2 text-xs text-destructive">{formError}</p>
          )}
        </div>

        {/* Footer stats */}
        {leads.length > 0 && (
          <div className="flex items-center gap-6 border-t border-white/[0.06] px-5 py-2 text-[11px] text-muted-foreground">
            <span>Count all {leads.length}</span>
          </div>
        )}
      </div>

      {/* ── Detail panel (right side) ───────────────────────────────── */}
      {selectedLead && (
        <div className="absolute inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSelectedLead(null)} />
      )}

      {selectedLead && (
        <DetailPanel
          lead={selectedLead}
          workspaceId={workspaceId}
          pipelines={pipelines}
          onClose={() => setSelectedLead(null)}
          onUpdate={(field, value) =>
            saveInlineEdit(selectedLead._id, field, value)
          }
          onDeletePipeline={handleDeletePipeline}
          userRole={userRole}
          currentUserId={currentUserId}
          members={members}
          onReassignOwner={(newOwnerId) =>
            reassignLeadOwner(selectedLead._id, newOwnerId)
          }
        />
      )}

      {/* ── CSV Upload Modal ────────────────────────────────────────── */}
      <CsvUploadModal
        workspaceId={workspaceId}
        open={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSuccess={fetchLeads}
      />

      {/* ── New Lead Dialog ─────────────────────────────────────────── */}
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent className="sm:max-w-[425px] duration-0 animate-none">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <TitleSelect value={newTitle} onChange={setNewTitle} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="bg-white/[0.04]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="bg-white/[0.04]"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  const clean = e.target.value.match(/<(.+)>$/)?.[1] ?? e.target.value.trim();
                  setEmailError(clean && !isValidEmail(clean) ? "Invalid email address" : "");
                }}
                className={`bg-white/[0.04] ${emailError ? "border-red-500/60" : ""}`}
              />
              {emailError && <p className="text-[11px] text-red-400">{emailError}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="flex gap-2">
                <CountryCodeSelect
                  value={newCountryCode}
                  selectedId={newCountryId}
                  onChange={(code, id) => {
                    setNewCountryCode(code);
                    if (id) setNewCountryId(id);
                    const digits = stripPhoneFormatting(newPhone).slice(0, getMaxPhoneDigits(code));
                    setNewPhone(formatPhoneDigits(digits, code));
                  }}
                />
                <Input
                  id="phone"
                  placeholder={PHONE_PLACEHOLDERS[newCountryCode] ?? "Phone number"}
                  value={newPhone}
                  onChange={(e) => {
                    const digits = stripPhoneFormatting(e.target.value).slice(0, getMaxPhoneDigits(newCountryCode));
                    setNewPhone(formatPhoneDigits(digits, newCountryCode));
                  }}
                  className="bg-white/[0.04]"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <CityCombobox
                value={newCity}
                onChange={setNewCity}
                countryId={newCountryId}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="source">Source <span className="text-muted-foreground/50 font-normal">(optional)</span></Label>
                <span className={`text-[10px] ${newSource.length > SOURCE_MAX_LEN * 0.8 ? "text-amber-400" : "text-muted-foreground/40"}`}>
                  {newSource.length}/{SOURCE_MAX_LEN}
                </span>
              </div>
              <Input
                id="source"
                placeholder="e.g. Referral, Website, Cold Call"
                value={newSource}
                maxLength={SOURCE_MAX_LEN}
                onChange={(e) => setNewSource(e.target.value)}
                className="bg-white/[0.04]"
              />
            </div>
            {formError && (
              <p className="text-xs text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowNewForm(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tags Manager Modal ──────────────────────────────────────── */}
      <TagsManager
        open={showTagsManager}
        onClose={() => setShowTagsManager(false)}
        workspaceId={workspaceId}
        onChanged={() => {
          fetchTags();
          fetchLeads();
        }}
      />
    </div>
  );
}

// ── Google Icon (inline SVG) ──────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════

// ── Editable Name cell (with avatar) ──────────────────────────────────
function EditableNameCell({
  lead,
  editing,
  editValue,
  onStart,
  onChange,
  onSave,
  onCancel,
  canEdit,
}: {
  lead: Lead;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  canEdit?: boolean;
}) {
  if (editing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(editValue);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onSave(editValue)}
        className="h-7 border-0 bg-white/[0.06] px-2 text-[13px] font-medium shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  const { title, firstName, lastName } = parseName(lead.name);
  return (
    <span
      className={`flex items-center gap-2 font-medium text-foreground ${canEdit === false ? "" : "cursor-text"}`}
      onDoubleClick={(e) => {
        if (canEdit === false) return;
        e.stopPropagation();
        onStart();
      }}
    >
      <User className="h-4 w-4 text-muted-foreground" />
      <span className="flex items-baseline gap-1.5">
        <span
          className={`text-[10px] uppercase tracking-wide ${
            title ? "text-muted-foreground" : "text-muted-foreground/30"
          }`}
        >
          {title ? (title.endsWith(".") ? title : `${title}.`) : "---"}
        </span>
        <span>{firstName}</span>
        {lastName && (
          <span className="text-muted-foreground">{lastName}</span>
        )}
      </span>
    </span>
  );
}

// ── Editable chip cell (email / phone) ────────────────────────────────
function EditableChipCell({
  value,
  editing,
  editValue,
  onStart,
  onChange,
  onSave,
  onCancel,
  canEdit,
}: {
  value: string;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  canEdit?: boolean;
}) {
  if (editing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(editValue);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onSave(editValue)}
        className="h-7 border-0 bg-white/[0.06] px-2 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  if (!value) {
    return (
      <span
        className={`text-muted-foreground/30 text-[12px] ${canEdit === false ? "" : "cursor-text"}`}
        onDoubleClick={(e) => {
          if (canEdit === false) return;
          e.stopPropagation();
          onStart();
        }}
      >
        —
      </span>
    );
  }
  return (
    <span
      className={`rounded bg-white/[0.06] px-2 py-0.5 text-[12px] text-muted-foreground ${canEdit === false ? "" : "cursor-text"}`}
      onDoubleClick={(e) => {
        if (canEdit === false) return;
        e.stopPropagation();
        onStart();
      }}
    >
      {value}
    </span>
  );
}

// ── Editable plain text cell (source) ─────────────────────────────────
function EditableTextCell({
  value,
  displayValue,
  editing,
  editValue,
  onStart,
  onChange,
  onSave,
  onCancel,
  canEdit,
}: {
  value: string;
  displayValue?: string;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  canEdit?: boolean;
}) {
  if (editing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(editValue);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onSave(editValue)}
        className="h-7 border-0 bg-white/[0.06] px-2 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  const shown = displayValue ?? value;
  return (
    <span
      className={`text-[12px] text-muted-foreground ${canEdit === false ? "" : "cursor-text"}`}
      title={displayValue && value !== displayValue ? value : undefined}
      onDoubleClick={(e) => {
        if (canEdit === false) return;
        e.stopPropagation();
        onStart();
      }}
    >
      {shown || <span className="text-muted-foreground/30">—</span>}
    </span>
  );
}

// ── Status badge (now driven by pipeline stage name) ──────────────────
function StatusDropdown({
  status,
  colorIndex,
  onChange,
  disabled,
}: {
  status: string;
  colorIndex?: number;
  onChange?: (s: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const style = getStatusStyle(status, colorIndex);

  return (
    <div className="relative inline-block">
      <span
        className={`inline-flex h-[22px] w-fit cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full pl-1.5 pr-2.5 text-[11px] font-medium transition-colors hover:brightness-110 ${disabled ? "opacity-70 pointer-events-none" : ""}`}
        style={{
          backgroundColor: style.bg,
          color: style.text,
        }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: style.dot }}
        />
        {status || "New Inquiry"}
      </span>
    </div>
  );
}

// ── Filter select (dropdown pill for Status / Source / City) ─────────
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isActive = value !== "all";
  const displayValue = value === "all" ? "All" : value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] transition-colors ${
          isActive
            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20"
            : "bg-white/[0.04] text-muted-foreground border border-white/[0.08] hover:bg-white/[0.08] hover:text-foreground"
        }`}
      >
        <span className="font-medium">{label}:</span>
        <span className="max-w-[120px] truncate">{displayValue}</span>
        <ChevronDown
          className={`h-2.5 w-2.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 min-w-[160px] overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          <button
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06] ${
              value === "all" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <span>All</span>
            {value === "all" && <Check className="h-3 w-3" />}
          </button>
          {options.length === 0 ? (
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground/40">
              No options
            </div>
          ) : (
            options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06] ${
                  value === opt ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="truncate max-w-[180px]">{opt}</span>
                {value === opt && <Check className="h-3 w-3 shrink-0 ml-2" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Title select ──────────────────────────────────────────────────────
function TitleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white/[0.04] px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground/60 text-sm"}>
          {value || "Select"}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="flex w-full px-3 py-1.5 text-[12px] text-muted-foreground/50 hover:bg-white/[0.06] hover:text-foreground text-left"
          >
            — None —
          </button>
          {COMMON_TITLES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange(t); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06] ${value === t ? "text-foreground" : "text-muted-foreground"}`}
            >
              {t}
              {value === t && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── City combobox ─────────────────────────────────────────────────────
function CityCombobox({ value, onChange, countryId }: { value: string; onChange: (v: string) => void; countryId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  const cities = CITIES_BY_COUNTRY[countryId] || [];
  const filtered = search
    ? cities.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : cities;

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="City"
        value={search}
        onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => cities.length > 0 && setOpen(true)}
        className="bg-white/[0.04]"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          {filtered.slice(0, 20).map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => { onChange(city); setSearch(city); setOpen(false); }}
              className="flex w-full px-3 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Country code select ───────────────────────────────────────────────
function CountryCodeSelect({
  value,
  selectedId,
  onChange,
  disabled = false,
}: {
  value: string;
  selectedId?: string;
  onChange?: (code: string, id?: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = selectedId
    ? COUNTRY_CODES.find((cc) => cc.id === selectedId)?.label
    : COUNTRY_CODES.find((cc) => cc.code === value)?.label;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        className={`flex h-8 items-center gap-1 rounded-md bg-white/[0.04] px-2 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.08] ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
        disabled={disabled}
      >
        {value}
        {label && <span className="text-muted-foreground/50">{label}</span>}
        <ChevronDown className="h-2.5 w-2.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-28 overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          {COUNTRY_CODES.map((cc) => (
            <button
              key={cc.id}
              onClick={() => {
                onChange?.(cc.code, cc.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <span>{cc.code}</span>
              <span className="text-muted-foreground/40">{cc.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────
function DetailPanel({
  lead,
  workspaceId,
  pipelines,
  onClose,
  onUpdate,
  onDeletePipeline,
  userRole,
  currentUserId,
  members,
  onReassignOwner,
}: {
  lead: Lead;
  workspaceId: string;
  pipelines: Pipeline[];
  onClose: () => void;
  onUpdate: (field: string, value: string) => void;
  onDeletePipeline: (pipelineId: string) => void;
  userRole?: string;
  currentUserId?: string;
  members?: { _id: string; name: string; role: "OWNER" | "AGENT" }[];
  onReassignOwner?: (newOwnerId: string) => Promise<boolean>;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "home" | "timeline" | "tasks" | "notes" | "emails"
  >("home");

  const tabs = [
    { key: "home" as const, label: "Home" },
    { key: "emails" as const, label: "Emails" },
    { key: "notes" as const, label: "Notes" },
    { key: "timeline" as const, label: "Timeline" },
    { key: "tasks" as const, label: "Tasks" },
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[85%] sm:w-80 flex flex-col border-l border-white/[0.06] bg-sidebar md:relative md:w-80 md:inset-auto">
      {/* Panel header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={onClose}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-6 w-6 items-center justify-center rounded bg-violet-600/80 text-[10px] font-bold text-white">
          {(() => {
            const { firstName } = parseName(lead.name);
            return (firstName || lead.name).charAt(0).toUpperCase();
          })()}
        </span>
        <div className="flex-1 truncate">
          {(() => {
            const { title, firstName, lastName } = parseName(lead.name);
            return (
              <p className="text-sm font-medium text-foreground flex items-baseline gap-1.5">
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    title ? "text-muted-foreground" : "text-muted-foreground/30"
                  }`}
                >
                  {title ? (title.endsWith(".") ? title : `${title}.`) : "---"}
                </span>
                <span>{firstName}</span>
                {lastName && (
                  <span className="text-muted-foreground">{lastName}</span>
                )}
              </p>
            );
          })()}
          <p className="text-[11px] text-muted-foreground">
            Created {timeAgo(lead.createdAt)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/[0.06] px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "home" && (
          <HomeTab
            lead={lead}
            pipelines={pipelines}
            onUpdate={onUpdate}
            onDeletePipeline={onDeletePipeline}
            userRole={userRole}
            currentUserId={currentUserId}
            members={members}
            onReassignOwner={onReassignOwner}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab lead={lead} workspaceId={workspaceId} />
        )}
        {activeTab === "emails" && (
          <EmailsTab lead={lead} workspaceId={workspaceId} />
        )}
        {activeTab === "timeline" && (
          <TimelineTab lead={lead} workspaceId={workspaceId} />
        )}
        {activeTab === "tasks" && (
          <TasksTab lead={lead} workspaceId={workspaceId} />
        )}
      </div>

      {/* Panel footer */}
      <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-4 py-2.5">
        <Button
          size="sm"
          className="h-7 gap-1.5 rounded-md px-4 text-xs"
          onClick={() => router.push(`/dashboard/leads/${lead._id}`)}
        >
          Open
        </Button>
      </div>
    </div>
  );
}

// ── Home tab content ──────────────────────────────────────────────────
function HomeTab({
  lead,
  pipelines,
  onUpdate,
  onDeletePipeline,
  userRole,
  currentUserId,
  members,
  onReassignOwner,
}: {
  lead: Lead;
  pipelines: Pipeline[];
  onUpdate: (field: string, value: string) => void;
  onDeletePipeline: (pipelineId: string) => void;
  userRole?: string;
  currentUserId?: string;
  members?: { _id: string; name: string; role: "OWNER" | "AGENT" }[];
  onReassignOwner?: (newOwnerId: string) => Promise<boolean>;
}) {
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);
  const currentOwnerId = getRealtorId(lead);
  const canReassign =
    userRole === "OWNER" && !!members && members.length > 0 && !!onReassignOwner;
  return (
    <div className="px-4 py-4">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Fields
      </p>
      <p className="mb-4 text-[11px] text-muted-foreground/40">General</p>

      <div className="space-y-4">
        {canReassign ? (
          <div className="flex items-start gap-3">
            <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
              <User className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[12px] text-muted-foreground">Agent</span>
            </div>
            <div className="flex-1">
              <select
                value={currentOwnerId}
                disabled={reassigning}
                onChange={async (e) => {
                  const newId = e.target.value;
                  if (!newId || newId === currentOwnerId) return;
                  setReassigning(true);
                  setReassignError(null);
                  const ok = await onReassignOwner!(newId);
                  if (!ok) setReassignError("Failed to reassign");
                  setReassigning(false);
                }}
                className="w-full rounded-md border border-white/[0.08] bg-transparent px-2 py-1 text-[12px] text-foreground outline-none transition-colors hover:border-white/[0.16] focus:border-white/[0.24] disabled:opacity-60"
              >
                {members!.map((m) => (
                  <option
                    key={m._id}
                    value={m._id}
                    className="bg-sidebar text-foreground"
                  >
                    {m.name} {m.role === "OWNER" ? "(Owner)" : ""}
                  </option>
                ))}
              </select>
              {reassignError && (
                <p className="mt-1 text-[10px] text-red-400">{reassignError}</p>
              )}
            </div>
          </div>
        ) : (
          userRole === "OWNER" && (
            <DetailRow
              icon={User}
              label="Agent"
              value={lead.realtorId?.name || "Unknown"}
            />
          )
        )}
        <EditableDetailRow
          icon={Mail}
          label="Email"
          value={lead.email}
          onSave={(v) => onUpdate("email", v)}
        />
        <PhoneDetailRow
          value={lead.phone}
          onSave={(v) => onUpdate("phone", v)}
        />
        {userRole === "OWNER" && getRealtorId(lead) !== currentUserId ? (
          <DetailRow
            icon={Tag}
            label="Status"
            value={<span className="text-muted-foreground/30">—</span>}
          />
        ) : (
          <DetailStatusRow
            status={lead.status}
            colorIndex={lead.stageId?.colorIndex}
            onChange={(s) => onUpdate("status", s)}
          />
        )}
        <EditableDetailRow
          icon={Globe}
          label="Source"
          value={lead.source}
          onSave={(v) => onUpdate("source", v)}
        />
        <DetailRow
          icon={Clock}
          label="Last update"
          value={timeAgo(lead.updatedAt)}
        />
        <DetailRow
          icon={Clock}
          label="Created"
          value={timeAgo(lead.createdAt)}
        />
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
              <TagsIcon className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[12px] text-muted-foreground">Tags</span>
            </div>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {lead.tags.map((tag) => (
                <span
                  key={tag._id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: hexToRgba(tag.color, 0.18),
                    color: tag.color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {!(userRole === "OWNER" && getRealtorId(lead) !== currentUserId) && (
        <div className="mt-8">
          <p className="mb-4 text-[13px] font-semibold text-foreground">
            Pipeline
          </p>
          <PipelineOpportunity
            pipelineId={lead.pipelineId}
            pipelines={pipelines}
            onChange={(p) => onUpdate("pipelineId", p)}
            onDelete={onDeletePipeline}
          />
        </div>
      )}
    </div>
  );
}

// ── Detail Row (read-only) ────────────────────────────────────────────
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
        <Icon className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 text-[12px] text-foreground">
        {value || <span className="text-muted-foreground/30">—</span>}
      </div>
    </div>
  );
}

// ── Editable Detail Row ───────────────────────────────────────────────
function EditableDetailRow({
  icon: Icon,
  label,
  value,
  onSave,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  function save() {
    setEditing(false);
    if (localValue !== value) onSave(localValue);
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex w-24 shrink-0 items-center gap-1.5 pt-1.5">
          <Icon className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[12px] text-muted-foreground">{label}</span>
        </div>
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setLocalValue(value);
              setEditing(false);
            }
          }}
          className="h-7 flex-1 border-0 bg-white/[0.06] px-2 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
        <Icon className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <div
        className="flex-1 cursor-text rounded px-1 py-0.5 text-[12px] text-foreground transition-colors hover:bg-white/[0.04]"
        onClick={() => {
          setLocalValue(value);
          setEditing(true);
        }}
      >
        {value || <span className="text-muted-foreground/30">{label}</span>}
      </div>
    </div>
  );
}

// ── Phone detail row (country select + masked input) ─────────────────
function PhoneDetailRow({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState("+1");
  const [phoneInput, setPhoneInput] = useState("");

  function enterEdit() {
    const p = parseStoredPhone(value);
    setCode(p.code);
    setPhoneInput(formatPhoneDigits(p.digits, p.code));
    setEditing(true);
  }

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    const digits = stripPhoneFormatting(phoneInput).slice(0, getMaxPhoneDigits(newCode));
    setPhoneInput(formatPhoneDigits(digits, newCode));
  }

  function handlePhoneInput(raw: string) {
    const digits = stripPhoneFormatting(raw).slice(0, getMaxPhoneDigits(code));
    setPhoneInput(formatPhoneDigits(digits, code));
  }

  function save() {
    setEditing(false);
    const digits = stripPhoneFormatting(phoneInput);
    const stored = digits ? `${code} ${digits}` : "";
    if (stored !== value) onSave(stored);
  }

  function cancelEdit() {
    setEditing(false);
  }

  const displayVal = (() => {
    if (!value) return "";
    const { code: c, digits } = parseStoredPhone(value);
    const fmt = formatPhoneDigits(digits, c);
    return `${c} ${fmt}`;
  })();

  if (editing) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex w-24 shrink-0 items-center gap-1.5 pt-1.5">
          <Phone className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[12px] text-muted-foreground">Phone</span>
        </div>
        <div className="flex flex-1 gap-1">
          <CountryCodeSelect value={code} onChange={(c) => handleCodeChange(c)} />
          <Input
            value={phoneInput}
            onChange={(e) => handlePhoneInput(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancelEdit();
            }}
            placeholder={PHONE_PLACEHOLDERS[code] ?? "Phone number"}
            className="h-7 flex-1 border-0 bg-white/[0.06] px-2 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
            autoFocus
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
        <Phone className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[12px] text-muted-foreground">Phone</span>
      </div>
      <div
        className="flex-1 cursor-text rounded px-1 py-0.5 text-[12px] text-foreground transition-colors hover:bg-white/[0.04]"
        onClick={enterEdit}
      >
        {displayVal || <span className="text-muted-foreground/30">Phone</span>}
      </div>
    </div>
  );
}

// ── Detail Status Row (dropdown) ──────────────────────────────────────
function DetailStatusRow({
  status,
  colorIndex,
  onChange,
}: {
  status: string;
  colorIndex?: number;
  onChange: (s: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex w-24 shrink-0 items-center gap-1.5 pt-0.5">
        <Tag className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[12px] text-muted-foreground">Status</span>
      </div>
      <div className="flex-1">
        <StatusDropdown
          status={status}
          colorIndex={colorIndex}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

// ── Pipeline Opportunity Box ───────────────────────────────────────────
function PipelineOpportunity({
  pipelineId,
  pipelines,
  onChange,
  onDelete,
}: {
  pipelineId?: string;
  pipelines: Pipeline[];
  onChange: (s: string) => void;
  onDelete: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedPipeline = pipelines.find((p) => p._id === pipelineId);
  const title = selectedPipeline?.name || "Select Pipeline";
  const initial = title.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5 transition-colors hover:bg-white/[0.08] w-max"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-green-500/20 text-[10px] font-bold text-green-400">
          {initial}
        </span>
        <span className="text-[12px] font-medium text-foreground">{title}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-64 overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          {pipelines.map((p) => (
            <div
              key={p._id}
              className="group relative flex w-full items-center"
            >
              <button
                onClick={() => {
                  onChange(p._id);
                  setOpen(false);
                }}
                className="flex flex-1 items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground pr-8"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-green-500/20 text-[10px] font-bold text-green-400">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">
                  {p.name} {p.type === "BUYER" ? "(Buyer)" : "(Seller)"}
                </span>
                {pipelineId === p._id && <Check className="ml-auto h-3 w-3" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    confirm(
                      `Are you sure you want to delete the pipeline "${p.name}"?`,
                    )
                  ) {
                    onDelete(p._id);
                    setOpen(false);
                  }
                }}
                className="absolute right-2 hidden p-1 text-muted-foreground hover:text-red-400 group-hover:block"
                title="Delete Pipeline"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CSV Upload Modal ──────────────────────────────────────────────────
function CsvUploadModal({
  workspaceId,
  open,
  onClose,
  onSuccess,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const csvTemplate = Papa.unparse([
    {
      title: "Mr.",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+1 5551234567",
      city: "New York",
      source: "Website",
    },
    {
      title: "",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "+1 5559876543",
      city: "Boston",
      source: "Referral",
    },
  ]);

  if (!open) return null;

  function handleDownloadTemplate() {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lead-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }
    setError("");
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        // Map row headers (case-insensitive) to expected keys
        const leads = rows
          .map((r: any) => {
            const getVal = (...keys: string[]) => {
              for (const key of keys) {
                const foundKey = Object.keys(r).find(
                  (k) => k.toLowerCase() === key.toLowerCase(),
                );
                if (foundKey && r[foundKey]?.trim()) return r[foundKey].trim();
              }
              return "";
            };
            const title = getVal("title");
            const firstName = getVal("firstName", "fname", "first name", "first_name");
            const lastName = getVal("lastName", "lname", "last name", "last_name");
            // Back-compat: fall back to a single `name` column if the new
            // split columns aren't supplied.
            const fallbackName = getVal("name");
            const name = firstName || lastName
              ? joinName(title, firstName, lastName)
              : fallbackName;
            return {
              name,
              email: getVal("email"),
              phone: getVal("phone"),
              city: getVal("city"),
              source: getVal("source") || "CSV Upload",
              workspaceId,
            };
          })
          .filter((l) => l.name); // only keep leads that have at least a name

        if (leads.length === 0) {
          setError(
            "No valid leads found. Provide either 'firstName' (with optional 'title' / 'lastName') or a single 'name' column.",
          );
          setUploading(false);
          return;
        }

        try {
          const res = await api("/lead/addLeads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ leads, workspaceId }),
          });

          if (!res.ok) {
            const data = await res.json();
            setError(data.message || "Failed to upload leads");
            setUploading(false);
            return;
          }

          setUploading(false);
          setFile(null);
          onSuccess();
          onClose();
        } catch (err) {
          setError("Network error occurred while uploading. Please try again.");
          setUploading(false);
        }
      },
      error: (err: any) => {
        setError("Failed to parse CSV file: " + err.message);
        setUploading(false);
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#121212] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Batch Record Add
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to import multiple leads at once.
          </p>
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-foreground">
                Required CSV Format:
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-7 gap-1.5 border-white/[0.08] bg-transparent px-2.5 text-[11px] hover:bg-white/[0.06]"
              >
                <Download className="h-3 w-3" />
                Download sample
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                title
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                firstName
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                lastName
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                email
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                phone
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                city
              </span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                source
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground/60">
              Only 'firstName' is strictly required. 'title' is optional —
              leave blank if not applicable. Headers are mandatory.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError("");
              }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-white/[0.06] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-white/[0.1] focus:outline-none"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {uploading ? (
            <Button size="sm" disabled className="h-8 text-xs w-28">
              Importing...
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs hover:bg-white/[0.06]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!file}
                className="h-8 text-xs w-28"
              >
                Import CSV
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// ── Notes tab content ─────────────────────────────────────────────────
export function NotesTab({ lead, workspaceId }: { lead: Lead; workspaceId: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await api(
        `/note/lead/${lead._id}/workspace/${workspaceId}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [lead._id, workspaceId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleAddNote() {
    if (!newNoteBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await api("/note/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Untitled",
          body: newNoteBody.trim(),
          relations: [lead._id],
          workspaceId,
        }),
      });
      if (res.ok) {
        setNewNoteBody("");
        setIsAdding(false);
        fetchNotes();
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          All{" "}
          <span className="ml-1 text-muted-foreground/60">{notes.length}</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="h-6 gap-1 px-2 text-[10px] border-white/[0.08] hover:bg-white/[0.04]"
        >
          <Plus className="h-2.5 w-2.5" />
          Add note
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground/40 text-center py-4">
            Loading notes...
          </p>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center">
            <p className="text-[11px] text-muted-foreground/40">
              No notes for this lead
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note._id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
            >
              <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap break-all">
                {note.body}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded bg-gray-500/10 text-gray-400">
                    <User className="h-2 w-2" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">
                    {note.realtorId.name}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/40">
                  {timeAgo(note.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="relative pt-2 space-y-2">
          <textarea
            placeholder="Type a note..."
            value={newNoteBody}
            onChange={(e) => setNewNoteBody(e.target.value)}
            className="w-full min-h-[100px] rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-[12px] outline-none placeholder:text-muted-foreground/40 focus:border-white/10"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/30">
              Markdown supported
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewNoteBody("");
                  setIsAdding(false);
                }}
                className="h-7 text-[11px] hover:bg-white/[0.04]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={submitting || !newNoteBody.trim()}
                className="h-7 text-[11px]"
              >
                {submitting ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────
export function TasksTab({ lead, workspaceId }: { lead: Lead; workspaceId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api(
        `/task/lead/${lead._id}/workspace/${workspaceId}`
      );
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      /* silent */
    }
  }, [lead._id, workspaceId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await api("/task/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          workspaceId,
          relations: [lead._id],
        }),
      });
      if (res.ok) {
        setNewTaskTitle("");
        setShowNewTask(false);
        fetchTasks();
      }
    } catch {
      /* silent */
    }
  }

  async function handleUpdateTask(
    taskId: string,
    field: string,
    value: string,
  ) {
    if (editingCell) setEditingCell(null);
    try {
      await api(`/task/details/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      });
      fetchTasks();
    } catch {
      /* silent */
    }
  }

  return (
    <div className="px-4 py-4 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          TODO {tasks.length}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewTask(true)}
          className="h-6 gap-1 px-2 text-[10px] border-white/[0.08]"
        >
          <Plus className="h-3 w-3" /> Add task
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {tasks.map((task) => (
          <div
            key={task._id}
            className="group flex items-start gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3 text-[12px] transition-colors hover:bg-white/[0.04]"
          >
            <button
              onClick={() =>
                handleUpdateTask(
                  task._id,
                  "status",
                  task.status === "Done" ? "To do" : "Done",
                )
              }
              className="mt-0.5 text-muted-foreground hover:text-foreground"
            >
              {task.status === "Done" ? (
                <CheckSquare className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-[4px] border-2 border-muted-foreground/40" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <EditableTextCell
                value={task.title}
                editing={
                  editingCell?.id === task._id && editingCell?.field === "title"
                }
                editValue={editValue}
                onStart={() => {
                  setEditingCell({ id: task._id, field: "title" });
                  setEditValue(task.title);
                }}
                onChange={setEditValue}
                onSave={(v) => handleUpdateTask(task._id, "title", v)}
                onCancel={() => setEditingCell(null)}
              />
            </div>
            {task.assigneeId && (
              <span className="flex items-center gap-1.5 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                <div className="flex h-3 w-3 items-center justify-center rounded bg-purple-500/20 text-purple-400">
                  <User className="h-2 w-2" />
                </div>
                {task.assigneeId.name}
              </span>
            )}
            {!task.assigneeId && task.realtorId && (
              <span className="flex items-center gap-1.5 rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                <div className="flex h-3 w-3 items-center justify-center rounded bg-slate-500/20 text-slate-400">
                  <User className="h-2 w-2" />
                </div>
                {task.realtorId.name}
              </span>
            )}
            <button
              onClick={async () => {
                if (!confirm("Delete this task?")) return;
                await api(`/task/details/${task._id}`, {
                  method: "DELETE",
                });
                fetchTasks();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400 -mr-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {showNewTask && (
          <div className="flex items-start gap-3 rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="mt-0.5 h-4 w-4 rounded-[4px] border-2 border-muted-foreground/40" />
            <div className="flex-1">
              <Input
                autoFocus
                placeholder="Task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                className="h-6 w-full border-0 bg-transparent px-0 text-[12px] shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              />
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateTask}
                  className="h-6 px-3 text-[10px]"
                >
                  Save
                </Button>
                <button
                  onClick={() => setShowNewTask(false)}
                  className="px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {tasks.length === 0 && !showNewTask && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CheckSquare className="mb-2 h-6 w-6 opacity-20" />
            <p className="text-xs">No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Emails Tab ────────────────────────────────────────────────────────
export function EmailsTab({ lead, workspaceId }: { lead: Lead; workspaceId: string }) {
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIntegration, setLoadingIntegration] = useState(true);
  const [isDrafting, setIsDrafting] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<{
    isConnected: boolean;
    email?: string;
  }>({ isConnected: false });

  const fetchCommunications = useCallback(async () => {
    try {
      const res = await api(`/lead/details/${lead._id}/emails`);
      if (res.ok) {
        const data = await res.json();
        setCommunications(data.emails || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [lead._id]);

  const fetchIntegrationStatus = useCallback(async () => {
    setLoadingIntegration(true);
    try {
      const res = await api("/emailIntegration/status");
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatus(data);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingIntegration(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunications();
    fetchIntegrationStatus();
  }, [fetchCommunications, fetchIntegrationStatus]);

  async function handleConnect() {
    try {
      const res = await api("/emailIntegration/google/auth-url");
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch {
      alert("Failed to get auth URL");
    }
  }

  if (isDrafting) {
    return (
      <EmailDraftForm
        lead={lead}
        onCancel={() => setIsDrafting(false)}
        onSent={() => {
          setIsDrafting(false);
          fetchCommunications();
        }}
      />
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {loadingIntegration ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500/40 mb-2" />
          <p className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-wider">
            Checking Gmail Status...
          </p>
        </div>
      ) : !integrationStatus.isConnected ? (
        <div className="rounded-lg border border-border bg-card/10 p-6 text-center space-y-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Connect your Gmail</h3>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed max-w-[180px] mx-auto">
              Sync your inbox to manage communications directly from the CRM.
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={handleConnect} 
            className="w-full h-9 bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium rounded-md shadow-sm text-xs gap-2"
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <History className="h-3 w-3 text-muted-foreground/60" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                History
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsDrafting(true)}
              className="h-7 gap-1.5 rounded-md px-3 text-[11px]"
            >
              <Send className="h-3 w-3" />
              Draft Email
            </Button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/20" />
              </div>
            ) : communications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center bg-white/[0.01]">
                <p className="text-[11px] text-muted-foreground/40 italic">
                  No email history available.
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground/30">
                  Click "Draft Email" to start a conversation.
                </p>
              </div>
            ) : (
              communications.map((comm) => (
                <div
                  key={comm._id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 relative overflow-hidden group cursor-pointer hover:bg-white/[0.04] transition-colors"
                  onClick={() => {
                    const win = window.open("", "_blank");
                    if (win) {
                      win.document.write(`
                        <html>
                          <head>
                            <title>${comm.subject}</title>
                            <style>
                              body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                              .header { border-bottom: 1px solid #eee; margin-bottom: 20px; padding-bottom: 10px; }
                              .subject { font-size: 20px; font-weight: bold; }
                              .meta { color: #666; font-size: 14px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div class="subject">${comm.subject}</div>
                              <div class="meta">From: ${comm.senderEmail} | Received: ${new Date(comm.receivedAt).toLocaleString()}</div>
                            </div>
                            <div>${comm.body}</div>
                          </body>
                        </html>
                      `);
                      win.document.close();
                    }
                  }}
                >
                  <div className="absolute top-1 right-2 p-1 opacity-5 group-hover:opacity-20 transition-opacity">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {comm.subject || "(No Subject)"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                        {comm.senderEmail}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 whitespace-nowrap">
                      {timeAgo(comm.receivedAt)}
                    </span>
                  </div>
                  <div
                    className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-1 opacity-80"
                    dangerouslySetInnerHTML={{
                      __html: comm.body?.replace(/<[^>]*>?/gm, " "),
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Email Draft Form ──────────────────────────────────────────────────
export function EmailDraftForm({
  lead,
  onCancel,
  onSent,
}: {
  lead: Lead;
  onCancel: () => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await api("/emailIntegration/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead._id,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      if (res.ok) {
        onSent();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to send email");
      }
    } catch {
      alert("Network error occurred");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="px-4 py-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          Compose Email
        </p>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Recipient
          </label>
          <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1.5 text-[12px] text-foreground border border-white/[0.06]">
            <Mail className="h-3 w-3 text-muted-foreground/40" />
            {lead.email}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Subject
          </label>
          <Input
            placeholder="Re: Property Inquiry"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-9 border-white/[0.08] bg-white/[0.04] px-3 text-[12px] shadow-none focus-visible:ring-1 focus-visible:ring-white/10"
          />
        </div>

        <div className="space-y-1 flex-1 flex flex-col">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Message
          </label>
          <textarea
            placeholder="Type your message here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full flex-1 min-h-[200px] rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-[12px] outline-none placeholder:text-muted-foreground/40 focus:border-white/10 resize-none leading-relaxed"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={sending}
          className="h-8 text-[11px] hover:bg-white/[0.04]"
        >
          Discard
        </Button>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          className="h-8 gap-2 rounded-md px-4 text-[11px]"
        >
          {sending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Timeline Tab ──────────────────────────────────────────────────────
export function TimelineTab({
  lead,
  workspaceId,
}: {
  lead: Lead;
  workspaceId: string;
}) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchActivities = useCallback(async () => {
    try {
      const res = await api(`/activity/lead/${lead._id}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [lead._id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "LEAD_CREATED":
        return <UserPlus className="h-3 w-3 text-blue-400" />;
      case "LEAD_UPDATED":
      case "STATUS_CHANGED":
      case "STAGE_CHANGED":
        return <RefreshCw className="h-3 w-3 text-orange-400" />;
      case "EMAIL_SENT":
        return <Mail className="h-3 w-3 text-green-400" />;
      case "NOTE_ADDED":
        return <MessageSquare className="h-3 w-3 text-violet-400" />;
      case "TASK_ADDED":
        return <Circle className="h-3 w-3 text-yellow-400" />;
      case "TASK_COMPLETED":
        return <CheckCircle className="h-3 w-3 text-emerald-400" />;
      default:
        return <History className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          Activity Log{" "}
          <span className="ml-1 text-muted-foreground/60">
            {activities.length}
          </span>
        </p>
      </div>

      <div className="relative space-y-4">
        {/* Vertical line connecting events */}
        {activities.length > 1 && (
          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-white/[0.06]" />
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground/40 text-center py-4">
            Loading activity...
          </p>
        ) : activities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center">
            <p className="text-[11px] text-muted-foreground/40">
              No activity recorded for this lead
            </p>
          </div>
        ) : (
          activities.map((activity, idx) => (
            <div key={activity._id} className="relative flex gap-3 group">
              {/* Icon container */}
              <div className="relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-sidebar shadow-sm ring-4 ring-sidebar">
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-foreground leading-tight">
                    {activity.content}
                  </p>
                  <span className="text-[10px] whitespace-nowrap text-muted-foreground/40">
                    {timeAgo(activity.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-muted-foreground/50">
                    by {activity.realtorId?.name || "System"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAG SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════

// ── Tag pill bar (filters leads by clicking a tag) ────────────────────
function TagPillBar({
  tags,
  activeTagId,
  onSelect,
  onManage,
}: {
  tags: TagDef[];
  activeTagId: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-thin scrollbar-thumb-white/10">
      <button
        onClick={() => onSelect(null)}
        className={`flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] transition-all ${
          activeTagId === null
            ? "bg-white/[0.10] text-foreground border border-white/[0.14]"
            : "bg-transparent text-muted-foreground border border-white/[0.06] hover:bg-white/[0.04] hover:text-foreground"
        }`}
      >
        All
      </button>
      {tags.map((tag) => {
        const active = activeTagId === tag._id;
        return (
          <button
            key={tag._id}
            onClick={() => onSelect(active ? null : tag._id)}
            className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-all ${
              active ? "ring-1" : "opacity-80 hover:opacity-100"
            }`}
            style={{
              backgroundColor: hexToRgba(tag.color, active ? 0.22 : 0.12),
              color: tag.color,
              boxShadow: active ? `inset 0 0 0 1px ${hexToRgba(tag.color, 0.5)}` : undefined,
            }}
          >
            {tag.type === "DYNAMIC" ? (
              <Sparkles className="h-2.5 w-2.5" />
            ) : (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
            )}
            <span className="truncate max-w-[120px]">{tag.name}</span>
          </button>
        );
      })}
      <button
        onClick={onManage}
        className="ml-auto shrink-0 flex h-6 items-center gap-1 rounded-full border border-dashed border-white/[0.08] px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-foreground"
        title="Manage tags"
      >
        <Settings2 className="h-2.5 w-2.5" />
        <span>Manage</span>
      </button>
    </div>
  );
}

// ── Assign-tag dropdown button (bulk action) ──────────────────────────
function AssignTagButton({
  tags,
  open,
  onOpen,
  onClose,
  onAssign,
  count,
  loading,
}: {
  tags: TagDef[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAssign: (tagId: string) => void;
  count: number;
  loading: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const manualTags = tags.filter((t) => t.type === "MANUAL");

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => (open ? onClose() : onOpen())}
        disabled={loading}
        className="h-7 gap-1.5 rounded-md px-3 text-xs border-white/[0.08] hover:bg-white/[0.04]"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <TagsIcon className="h-3 w-3" />
        )}
        Assign tag ({count})
        <ChevronDown className="h-2.5 w-2.5 opacity-60" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          {manualTags.length === 0 ? (
            <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">
              No manual tags. Create one first.
            </p>
          ) : (
            manualTags.map((tag) => (
              <button
                key={tag._id}
                onClick={() => onAssign(tag._id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06]"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="truncate text-left">{tag.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Lead row tags cell — shows badges + add/remove popover ────────────
function TagsCell({
  tags,
  leadId,
  workspaceId,
  canEdit,
  onChanged,
}: {
  tags: TagDef[];
  leadId: string;
  workspaceId: string;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    api("/tag/list", { headers: { "x-workspace-id": workspaceId } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAllTags)
      .catch(() => {});
  }, [open, workspaceId]);

  const assignedIds = new Set(tags.map((t) => t._id));

  async function toggleTag(tag: TagDef) {
    if (tag.type === "DYNAMIC") return; // virtual — cannot manually toggle
    setBusy(true);
    try {
      const path = assignedIds.has(tag._id) ? "/lead/remove-tags" : "/lead/assign-tags";
      const res = await api(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({ leadIds: [leadId], tagId: tag._id }),
      });
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => canEdit && setOpen((o) => !o)}
        className={`flex flex-wrap items-center gap-1 min-h-[22px] ${
          canEdit ? "cursor-pointer" : "cursor-default"
        }`}
        disabled={!canEdit}
      >
        {tags.length === 0 ? (
          canEdit ? (
            <span className="flex items-center gap-1 rounded-md border border-dashed border-white/[0.08] px-1.5 py-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:border-white/[0.16] hover:text-muted-foreground">
              <Plus className="h-2.5 w-2.5" />
              tag
            </span>
          ) : (
            <span className="text-muted-foreground/30 text-[12px]">—</span>
          )
        ) : (
          tags.slice(0, 3).map((tag) => (
            <span
              key={tag._id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: hexToRgba(tag.color, 0.18),
                color: tag.color,
              }}
              title={tag.type === "DYNAMIC" ? `${tag.name} (Smart View)` : tag.name}
            >
              {tag.type === "DYNAMIC" && <Sparkles className="h-2 w-2" />}
              <span className="truncate max-w-[80px]">{tag.name}</span>
            </span>
          ))
        )}
        {tags.length > 3 && (
          <span className="text-[10px] text-muted-foreground/60">
            +{tags.length - 3}
          </span>
        )}
      </button>

      {open && canEdit && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Toggle manual tags
          </div>
          {allTags.filter((t) => t.type === "MANUAL").length === 0 ? (
            <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">
              No manual tags yet.
            </p>
          ) : (
            allTags
              .filter((t) => t.type === "MANUAL")
              .map((tag) => {
                const checked = assignedIds.has(tag._id);
                return (
                  <button
                    key={tag._id}
                    onClick={() => toggleTag(tag)}
                    disabled={busy}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] transition-colors hover:bg-white/[0.06]"
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                        checked
                          ? "border-transparent"
                          : "border-white/[0.16]"
                      }`}
                      style={
                        checked ? { backgroundColor: tag.color } : undefined
                      }
                    >
                      {checked && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate text-left flex-1">{tag.name}</span>
                  </button>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
