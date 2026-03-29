import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { refreshTrackedChannel } from "@/lib/jobs/refresh";
import { apiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const jobSecret = process.env.JOB_SECRET;
  if (!jobSecret || authHeader !== `Bearer ${jobSecret}`) {
    return apiError(401, "Unauthorized", "UNAUTHORIZED");
  }

  const body = (await req.json().catch(() => ({}))) as { periodDays?: number; limit?: number };
  const periodDays = typeof body.periodDays === "number" ? body.periodDays : 30;
  const limit = typeof body.limit === "number" ? body.limit : 10;

  const channels = await prisma.channel.findMany({ take: Math.max(1, Math.min(limit, 50)) });
  const results = [];

  for (const channel of channels) {
    try {
      const r = await refreshTrackedChannel(channel.id, periodDays);
      results.push({ channelId: channel.id, ...r });
    } catch {
      results.push({ channelId: channel.id, refreshed: false, reason: "Refresh failed" });
    }
  }

  return NextResponse.json({ count: channels.length, results });
}

