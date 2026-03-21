import mongoose from "mongoose";
import { Workspace } from "../workspace/workspace.model";
import { User } from "../user/user.model";
import { Event } from "./events.model";
import { Visitor } from "./visitors.model";
import { Lead } from "../lead/lead.model";
import { ApiKey } from "./key.model";

export class TrackerService {
  public isValidDomain(origin: string, domain: string | null | undefined) {
    if (!domain) return false;
    try {
      const hostname = new URL(origin).hostname;
      return (
        hostname === domain ||
        hostname.endsWith("." + domain)
      );
    } catch {
      return false;
    }
  }

  public async processBatchEvents(
    apiKey: string,
    visitorId: string,
    events: any[],
    origin: string,
    userAgent?: string
  ) {
    // 1. Validate apiKey and get realtor/workspace
    const keyDoc = await ApiKey.findOne({ key: apiKey }).select("workspace user domain");
    if (!keyDoc) {
      throw new Error("INVALID_API_KEY");
    }

    // 2. Validate domain
    if (!this.isValidDomain(origin, keyDoc.domain)) {
      throw new Error("INVALID_DOMAIN");
    }

    // 3. Ensure visitor exists
    const visitor = await Visitor.findOneAndUpdate(
      { visitorId, workspaceId: keyDoc.workspace as any },
      { 
        $set: { realtorId: keyDoc.user },
        $setOnInsert: { workspaceId: keyDoc.workspace } 
      },
      { upsert: true, new: true }
    ).select("leadId");

    // 4. Prepare events
    const allowedEvents = ["page_view", "click", "form_submit", "identify"];
    const formattedEvents = events.map((e: any) => {
      if (!allowedEvents.includes(e.event)) {
        console.warn("Invalid event:", e.event);
        return null;
      }

      const data = typeof e.data === "object" ? { ...e.data } : {};
      if (userAgent) data.userAgent = userAgent;

      return {
        workspaceId: keyDoc.workspace,
        realtorId: keyDoc.user,
        visitorId: visitorId,
        leadId: (visitor as any).leadId || null,
        event: e.event,
        data,
        timestamp: e.timestamp || Date.now(),
      };
    }).filter(Boolean);

    // 5. Store events
    if (formattedEvents.length > 0) {
      await Event.insertMany(formattedEvents, { ordered: false });
      if (process.env.NODE_ENV !== "production") {
        console.log("Track:", {
          workspace: keyDoc.workspace,
          realtor: keyDoc.user,
          visitorId,
          eventsCount: formattedEvents.length
        });
      }
    }
  }

  public async identifyVisitor(
    apiKey: string,
    visitorId: string,
    email: string,
    name: string | undefined,
    origin: string
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Validate apiKey
    const keyDoc = await ApiKey.findOne({ key: apiKey }).select("workspace user domain");
    if (!keyDoc) {
      throw new Error("INVALID_API_KEY");
    }

    // 1.5 Validate domain
    if (!this.isValidDomain(origin, keyDoc.domain)) {
      throw new Error("INVALID_DOMAIN");
    }

    // 2. Find or create lead
    const lead = await Lead.findOneAndUpdate(
      { email: normalizedEmail, workspaceId: keyDoc.workspace as any },
      {
        $set: { 
          name: typeof name === "string" ? name.slice(0, 100) : undefined,
          realtorId: keyDoc.user 
        },
        $setOnInsert: { 
          workspaceId: keyDoc.workspace,
          source: "tracker" 
        }
      },
      { upsert: true, new: true }
    );

    // 3. Link visitor → lead
    const oldVisitor = await Visitor.findOne({ visitorId, workspaceId: keyDoc.workspace as any });
    
    await Visitor.findOneAndUpdate(
      { visitorId, workspaceId: keyDoc.workspace as any },
      { 
        leadId: lead._id, 
        workspaceId: keyDoc.workspace,
        realtorId: keyDoc.user 
      },
      { upsert: true, new: true }
    );

    // 4. Update ALL past events
    if (!oldVisitor || oldVisitor.leadId?.toString() !== (lead._id as any).toString()) {
      await Event.updateMany(
        { visitorId, workspaceId: keyDoc.workspace as any },
        { leadId: lead._id, realtorId: keyDoc.user }
      );
    }

    return lead;
  }

  public async getEvents(workspaceId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find({ workspaceId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('leadId', 'name email'),
      Event.countDocuments({ workspaceId })
    ]);

    return {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  public async getVisitors(workspaceId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [visitors, total] = await Promise.all([
      Visitor.find({ workspaceId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('leadId', 'name email'),
      Visitor.countDocuments({ workspaceId })
    ]);

    return {
      visitors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  private normalizeDomain(input: string | undefined): string | null {
    if (!input) return null;
    let urlString = input.trim().toLowerCase();
    if (!urlString.startsWith("http")) {
      urlString = "https://" + urlString;
    }
    try {
      const url = new URL(urlString);
      let hostname = url.hostname;
      if (hostname.startsWith("www.")) {
        hostname = hostname.slice(4);
      }
      return hostname;
    } catch {
      return null;
    }
  }

  public async generateApiKey(workspaceId: string, userId: string, domain?: string) {
    const workspace = await Workspace.findById(workspaceId).select("_id");
    if (!workspace) {
      throw new Error("WORKSPACE_NOT_FOUND");
    }

    const realtor = await User.findById(userId).select("website");
    if (!realtor) {
      throw new Error("USER_NOT_FOUND");
    }

    // 1. If domain is provided, it must be globally unique
    if (domain) {
      const normalizedProvided = this.normalizeDomain(domain);
      if (!normalizedProvided) {
        throw new Error("INVALID_DOMAIN_FORMAT");
      }

      // 2. It must be globally unique
      const existingDomainKey = await ApiKey.findOne({ 
        domain: normalizedProvided,
        user: { $ne: userId as any } 
      });
      
      if (existingDomainKey) {
        throw new Error("DOMAIN_ALREADY_IN_USE");
      }
      
      // 3. Automatically update the user's profile website
      await User.findByIdAndUpdate(userId, { $set: { website: normalizedProvided } });
      
      // Use the normalized domain for storage
      domain = normalizedProvided;
    } 

    const newApiKey = crypto.randomUUID();
    
    await ApiKey.findOneAndUpdate(
      { user: userId as any, workspace: workspaceId as any },
      { 
        $set: { 
          key: newApiKey,
          domain: domain 
        } 
      },
      { upsert: true, new: true }
    );

    return newApiKey;
  }

  public async getTrackerDetails(workspaceId: string, userId: string) {
    const keyDoc = await ApiKey.findOne({ user: userId, workspace: workspaceId }).select("key domain");
    
    const scriptUrl = process.env.STATIC_SCRIPT_URL || "http://localhost:3000/tracker.js";
    
    if (!keyDoc) {
      return {
        apiKey: null,
        trackerScript: null,
        scriptUrl,
        domain: null
      };
    }
    const trackerScript = keyDoc.domain ? `
<script 
  src="${scriptUrl}"
  data-key="${keyDoc.key}"
  defer>
</script>
    `.trim() : null;

    return {
      apiKey: keyDoc.key,
      trackerScript,
      scriptUrl,
      domain: keyDoc.domain
    };
  }
  private parseDevice(ua: string): "Desktop" | "Mobile" | "Tablet" {
    if (!ua) return "Desktop";
    const lower = ua.toLowerCase();
    if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(lower)) return "Tablet";
    if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(lower)) return "Mobile";
    return "Desktop";
  }

  public async getDashboardStats(workspaceId: string) {
    const now = new Date();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

    // Run all queries in parallel
    const [
      totalSessions,
      uniqueAnonymousVisitors,
      avgPagesResult,
      heatScoreResult,
      liveEventsRaw,
      deviceEventsRaw
    ] = await Promise.all([
      // 1. Total sessions (total events = total engagement)
      Event.countDocuments({ workspaceId }),

      // 2. Unique visitors with no leadId (anonymous)
      Visitor.countDocuments({ workspaceId, leadId: null }),

      // 3. Avg pages per session (page_view count per unique visitorId)
      Event.aggregate([
        { $match: { workspaceId: new (mongoose.Types.ObjectId as any)(workspaceId), event: "page_view" } },
        { $group: { _id: "$visitorId", pageCount: { $sum: 1 } } },
        { $group: { _id: null, avgPages: { $avg: "$pageCount" }, totalVisitors: { $sum: 1 } } }
      ]),

      // 4. Engagement heat score — bucket visitors by total event count
      Event.aggregate([
        { $match: { workspaceId: new (mongoose.Types.ObjectId as any)(workspaceId) } },
        { $group: { _id: "$visitorId", count: { $sum: 1 } } },
        {
          $bucket: {
            groupBy: "$count",
            boundaries: [1, 2, 5, 11],
            default: "hot",
            output: { count: { $sum: 1 } }
          }
        }
      ]),

      // 5. Live visitors — page_view events in last 15 min
      Event.aggregate([
        {
          $match: {
            workspaceId: new (mongoose.Types.ObjectId as any)(workspaceId),
            event: "page_view",
            timestamp: { $gte: fifteenMinAgo }
          }
        },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: "$visitorId",
            pages: { $push: "$data.url" },
            lastSeen: { $first: "$timestamp" },
            userAgent: { $first: "$data.userAgent" },
            leadId: { $first: "$leadId" }
          }
        },
        { $sort: { lastSeen: -1 } },
        { $limit: 20 }
      ]),

      // 6. Device breakdown — from all events with userAgent
      Event.aggregate([
        {
          $match: {
            workspaceId: new (mongoose.Types.ObjectId as any)(workspaceId),
            "data.userAgent": { $exists: true, $ne: null }
          }
        },
        { $group: { _id: "$visitorId", userAgent: { $first: "$data.userAgent" } } }
      ])
    ]);

    // Process avg pages
    const avgPagesPerSession = avgPagesResult.length > 0
      ? Math.round(avgPagesResult[0].avgPages * 10) / 10
      : 0;

    // Process heat score buckets
    const heatMap: { new: number; cool: number; warm: number; hot: number } = { new: 0, cool: 0, warm: 0, hot: 0 };
    for (const bucket of heatScoreResult) {
      if (bucket._id === 1) heatMap.new = bucket.count;
      else if (bucket._id === 2) heatMap.cool = bucket.count;
      else if (bucket._id === 5) heatMap.warm = bucket.count;
      else heatMap.hot = bucket.count; // "hot" default bucket (11+)
    }
    const heatTotal = Object.values(heatMap).reduce((a, b) => a + b, 0) || 1;
    const engagementHeatScore = {
      hot: Math.round((heatMap.hot / heatTotal) * 100),
      warm: Math.round((heatMap.warm / heatTotal) * 100),
      cool: Math.round((heatMap.cool / heatTotal) * 100),
      new: Math.round((heatMap.new / heatTotal) * 100),
    };

    // Process live visitors — compute heat label per visitor from all-time event count
    const liveVisitorIds = liveEventsRaw.map((v: any) => v._id);
    let visitorHeatMap: Record<string, string> = {};
    if (liveVisitorIds.length > 0) {
      const visitorCounts = await Event.aggregate([
        { $match: { workspaceId: new (mongoose.Types.ObjectId as any)(workspaceId), visitorId: { $in: liveVisitorIds } } },
        { $group: { _id: "$visitorId", count: { $sum: 1 } } }
      ]);
      for (const vc of visitorCounts) {
        if (vc.count >= 11) visitorHeatMap[vc._id] = "Hot";
        else if (vc.count >= 5) visitorHeatMap[vc._id] = "Warm";
        else if (vc.count >= 2) visitorHeatMap[vc._id] = "Cool";
        else visitorHeatMap[vc._id] = "New";
      }
    }

    // Fetch lead info for live visitors
    const leadIds = liveEventsRaw.filter((v: any) => v.leadId).map((v: any) => v.leadId);
    let leadMap: Record<string, any> = {};
    if (leadIds.length > 0) {
      const leads = await Lead.find({ _id: { $in: leadIds } }).select("name email").lean();
      for (const l of leads) {
        leadMap[(l._id as any).toString()] = l;
      }
    }

    const liveVisitors = liveEventsRaw.map((v: any, i: number) => {
      const device = this.parseDevice(v.userAgent || "");
      const pages = (v.pages || []).filter(Boolean).map((url: string) => {
        try {
          return new URL(url).pathname;
        } catch { return url; }
      });
      const uniquePages = [...new Set(pages)].slice(0, 5);
      const lead = v.leadId ? leadMap[v.leadId.toString()] : null;
      const minutesAgo = Math.round((now.getTime() - new Date(v.lastSeen).getTime()) / 60000);

      return {
        id: v._id,
        label: lead ? lead.name || lead.email : `Visitor #${String.fromCharCode(65 + (i % 26))}-${v._id.slice(-4)}`,
        device,
        pages: uniquePages,
        heat: visitorHeatMap[v._id] || "New",
        minutesAgo,
        isLive: minutesAgo < 1,
        clicks: [] as any[],
      };
    });

    // Fetch recent click events for live visitors
    if (liveVisitorIds.length > 0) {
      const clickEvents = await Event.find({
        workspaceId,
        visitorId: { $in: liveVisitorIds },
        event: "click",
        timestamp: { $gte: fifteenMinAgo },
      })
        .sort({ timestamp: -1 })
        .limit(100)
        .select("visitorId data timestamp")
        .lean();

      // Group clicks by visitorId
      const clicksByVisitor: Record<string, any[]> = {};
      for (const ev of clickEvents) {
        const vid = (ev as any).visitorId;
        if (!clicksByVisitor[vid]) clicksByVisitor[vid] = [];
        if (clicksByVisitor[vid].length >= 10) continue; // max 10 clicks per visitor
        const d = (ev as any).data || {};
        clicksByVisitor[vid].push({
          text: d.text || "",
          tagName: d.tagName || "",
          href: d.href || "",
          id: d.id || "",
          url: d.url || "",
          timestamp: (ev as any).timestamp,
        });
      }

      // Attach clicks to each live visitor
      for (const visitor of liveVisitors) {
        visitor.clicks = clicksByVisitor[visitor.id] || [];
      }
    }

    // Process device breakdown
    const deviceCounts: { Desktop: number; Mobile: number; Tablet: number } = { Desktop: 0, Mobile: 0, Tablet: 0 };
    for (const ev of deviceEventsRaw) {
      const device = this.parseDevice(ev.userAgent || "");
      deviceCounts[device]++;
    }
    const deviceTotal = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;
    const deviceBreakdown = {
      desktop: Math.round((deviceCounts.Desktop / deviceTotal) * 100),
      mobile: Math.round((deviceCounts.Mobile / deviceTotal) * 100),
      tablet: Math.round((deviceCounts.Tablet / deviceTotal) * 100),
    };

    return {
      totalSessions,
      uniqueVisitors: uniqueAnonymousVisitors,
      avgPagesPerSession,
      engagementHeatScore,
      liveVisitors,
      liveVisitorCount: liveVisitors.length,
      deviceBreakdown,
    };
  }
}

export const trackerService = new TrackerService();
