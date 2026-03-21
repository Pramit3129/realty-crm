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
    // Run all queries in parallel
    const [
      totalSessions,
      uniqueAnonymousVisitors,
      avgPagesResult,
      heatScoreResult,
      clickHotspotsRaw,
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

      // 5. Top interactions — all events grouped by type and key data
      Event.aggregate([
        {
          $match: {
            workspaceId: new (mongoose.Types.ObjectId as any)(workspaceId),
          }
        },
        {
          $project: {
            event: 1,
            data: 1,
            timestamp: 1,
            _key: {
              $switch: {
                branches: [
                  { case: { $eq: ["$event", "page_view"] }, then: "$data.url" },
                  { case: { $eq: ["$event", "click"] }, then: { $ifNull: ["$data.text", "Unknown click"] } },
                  { case: { $eq: ["$event", "form_submit"] }, then: { $ifNull: ["$data.formId", "Unknown form"] } },
                ],
                default: "other"
              }
            }
          }
        },
        {
          $group: {
            _id: { event: "$event", key: "$_key" },
            count: { $sum: 1 },
            lastSeen: { $max: "$timestamp" },
            sampleData: { $first: "$data" }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 15 }
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

    // Process top interactions
    const maxCount = clickHotspotsRaw.length > 0 ? clickHotspotsRaw[0].count : 1;
    const clickHotspots = clickHotspotsRaw.map((item: any) => {
      const eventType: string = item._id.event || "unknown";
      const rawKey: string = item._id.key || "";
      let label = rawKey;
      let href = "";

      // Prettify label based on event type
      if (eventType === "page_view" && rawKey) {
        try {
          const url = new URL(rawKey);
          label = url.pathname === "/" ? "Home Page" : url.pathname;
          href = url.pathname;
        } catch {
          label = rawKey.slice(0, 60);
        }
      } else if (eventType === "click") {
        label = rawKey || "Unknown click";
        const data = item.sampleData || {};
        if (data.href) {
          try {
            href = new URL(data.href, "https://x.com").pathname;
          } catch {
            href = data.href;
          }
        }
      } else if (eventType === "form_submit") {
        label = rawKey === "unknown" ? "Form Submission" : `Form: ${rawKey}`;
      }

      if (label.length > 50) label = label.slice(0, 47) + "...";

      return {
        label,
        eventType,
        tagName: eventType === "click" ? (item.sampleData?.tagName || "ELEMENT") : eventType.toUpperCase(),
        href,
        count: item.count,
        percent: Math.round((item.count / maxCount) * 100),
      };
    });

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
      clickHotspots,
      deviceBreakdown,
    };
  }
}

export const trackerService = new TrackerService();
