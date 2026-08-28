import { Severity, Status } from "@/generated/prisma/enums";
import { z } from "zod";

export const incidentSchema = z.object({
  title: z.string().min(1).max(150),
  description: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  severity: z.enum(Severity),
});

export type IncidentSchema = z.infer<typeof incidentSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(Status),
});

export type UpdateStatusSchema = z.infer<typeof updateStatusSchema>;
