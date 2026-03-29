import { z } from "zod";

const envSchema = z.object({
  YOUTUBE_API_KEY: z.string().min(1)
});

// During Vercel build time, environment variables might not be populated yet.
// We provide a fallback to prevent the build process from crashing during static analysis.
export const env = envSchema.parse({
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || "BUILD_TIME_PLACEHOLDER"
});
