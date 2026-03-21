import { Workspace } from "../workspace/workspace.model";
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
    origin: string
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

      return {
        workspaceId: keyDoc.workspace,
        realtorId: keyDoc.user,
        visitorId: visitorId,
        leadId: (visitor as any).leadId || null,
        event: e.event,
        data: typeof e.data === "object" ? e.data : {},
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
  public async generateApiKey(workspaceId: string, userId: string, domain?: string) {
    const workspace = await Workspace.findById(workspaceId).select("_id");
    if (!workspace) {
      throw new Error("WORKSPACE_NOT_FOUND");
    }

    // 1. If domain is provided, it must be globally unique
    if (domain) {
      const existingDomainKey = await ApiKey.findOne({ 
        domain: domain,
        user: { $ne: userId as any } 
      });
      
      if (existingDomainKey) {
        throw new Error("DOMAIN_ALREADY_IN_USE");
      }
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
    
    if (!keyDoc) {
      throw new Error("API_KEY_NOT_FOUND");
    }

    const scriptUrl = process.env.STATIC_SCRIPT_URL || "http://localhost:3000/tracker.js";
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
}

export const trackerService = new TrackerService();
