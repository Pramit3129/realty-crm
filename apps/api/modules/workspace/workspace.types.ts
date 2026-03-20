import { z } from "zod";

export const createWorkspaceSchema = z.object({
    name: z.string().min(1, "Workspace name is required"),
    domain: z.string().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
