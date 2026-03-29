import { NextRequest, NextResponse } from "next/server";
import { refreshTrackedChannel } from "@/lib/jobs/refresh";
import { apiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const jobSecret = process.env.JOB_SECRET;
  if (!jobSecret || authHeader !== `Bearer ${jobSecret}`) {
    return apiError(401, "Unauthorized", "UNAUTHORIZED");
  }

  const body = (await req.json().catch(() => ({}))) as { channelId?: string; periodDays?: number };
  if (!body.channelId) return apiError(400, "channelId is required", "INVALID_INPUT");

  const periodDays = typeof body.periodDays === "number" ? body.periodDays : 30;
  const result = await refreshTrackedChannel(body.channelId, periodDays);
  return NextResponse.json(result);
}
