export function formatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown; details?: unknown; hint?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
    const details = (error as { details?: unknown }).details;
    if (typeof details === "string" && details.trim()) {
      return details;
    }
    const hint = (error as { hint?: unknown }).hint;
    if (typeof hint === "string" && hint.trim()) {
      return hint;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Đã xảy ra lỗi";
    }
  }
  return String(error);
}
