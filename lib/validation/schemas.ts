import { z } from "zod";

export const analyzeRequestSchema = z.object({
  channelInput: z.string().trim().min(3).max(300),
  periodDays: z.number().int().min(7).max(365).default(30)
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
