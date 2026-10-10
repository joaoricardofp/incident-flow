import { z } from "zod";

export const renameWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type RenameWorkspaceSchema = z.infer<typeof renameWorkspaceSchema>;
