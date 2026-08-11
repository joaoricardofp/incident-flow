import { z } from "zod";

export const timelineCommentSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export type TimelineCommentSchema = z.infer<typeof timelineCommentSchema>;
