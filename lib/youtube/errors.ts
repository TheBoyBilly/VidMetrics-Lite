/**
 * YouTube API Error Classification
 * Used to distinguish between different failure modes
 */

export type YouTubeErrorType =
  | "QUOTA_EXCEEDED"
  | "INVALID_AUTH"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PARSE_ERROR"
  | "UNKNOWN";

export class YouTubeAPIError extends Error {
  constructor(
    public type: YouTubeErrorType,
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "YouTubeAPIError";
  }

  static fromResponse(status: number, errorData?: Record<string, unknown>): YouTubeAPIError {
    // YouTube API error responses have structure: { error: { code, message, errors: [...] } }
    const errorBody = errorData?.error as { code?: string | number, message?: string } | undefined;
    const errorCode = errorBody?.code;
    const errorMessage = errorBody?.message;

    if (status === 429 || errorCode === "quotaExceeded") {
      return new YouTubeAPIError("QUOTA_EXCEEDED", "YouTube API quota exceeded", status, errorData);
    }

    if (status === 403) {
      return new YouTubeAPIError(
        "INVALID_AUTH",
        "Authentication failed - check API key",
        status,
        errorData
      );
    }

    if (status === 404) {
      return new YouTubeAPIError("NOT_FOUND", "Channel or resource not found", status, errorData);
    }

    if (status >= 500) {
      return new YouTubeAPIError(
        "NETWORK_ERROR",
        "YouTube API server error - retry later",
        status,
        errorData
      );
    }

    return new YouTubeAPIError("UNKNOWN", errorMessage || "YouTube API error", status, errorData);
  }

  static fromTimeout(): YouTubeAPIError {
    return new YouTubeAPIError("TIMEOUT", "YouTube API request timed out after 12 seconds");
  }

  static fromNetworkError(error: unknown): YouTubeAPIError {
    return new YouTubeAPIError(
      "NETWORK_ERROR",
      "Network error while calling YouTube API",
      undefined,
      error
    );
  }

  /**
   * Safe error message for client - never includes original API details
   */
  getClientMessage(): string {
    const messages: Record<YouTubeErrorType, string> = {
      QUOTA_EXCEEDED: "Service temporarily rate limited. Please try again in a few minutes.",
      INVALID_AUTH: "Service authentication error. Please contact support.",
      RATE_LIMITED: "Too many requests. Please wait before trying again.",
      NOT_FOUND: "Channel not found. Please verify the URL or handle.",
      NETWORK_ERROR: "Network error. Please check your connection and try again.",
      TIMEOUT: "Request timed out. Please try again.",
      PARSE_ERROR: "Invalid response from service. Please try again.",
      UNKNOWN: "An unexpected error occurred. Please try again."
    };
    return messages[this.type];
  }
}

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputValidationError";
  }
}
