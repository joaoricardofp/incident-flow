import { z } from "zod";
import { Severity, Status } from "@/generated/prisma/enums";

export const timelineCommentSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export type TimelineCommentSchema = z.infer<typeof timelineCommentSchema>;

export const statusChangeMetadataSchema = z.object({
  from: z.enum(Status),
  to: z.enum(Status),
});

export type StatusChangeMetadata = z.infer<typeof statusChangeMetadataSchema>;

export const severityChangeMetadataSchema = z.object({
  from: z.enum(Severity),
  to: z.enum(Severity),
});

export type SeverityChangeMetadata = z.infer<
  typeof severityChangeMetadataSchema
>;
