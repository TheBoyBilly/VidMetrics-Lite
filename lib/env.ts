import { z } from "zod";

const envSchema = z.object({
  YOUTUBE_API_KEY: z.string().min(1)
});

export const env = envSchema.parse({
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY
});
