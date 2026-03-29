// Resolve at runtime to avoid baking build-time placeholders into the bundle
export const env = {
  get YOUTUBE_API_KEY() {
    return process.env.YOUTUBE_API_KEY || "BUILD_TIME_PLACEHOLDER";
  }
};
