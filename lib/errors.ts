import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: string;
  message: string;
};

export function apiError(
  status: number,
  message: string,
  error = "REQUEST_FAILED",
  requestId?: string
) {
  const headers: Record<string, string> = {};
  if (requestId) headers["X-Request-ID"] = requestId;

  return NextResponse.json<ApiErrorBody>({ error, message }, { status, headers });
}

