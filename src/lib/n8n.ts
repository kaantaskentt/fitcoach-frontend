import type { N8nResponse } from "@/types";

const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

export async function sendMessage(
  message: string,
  sessionId: string
): Promise<N8nResponse> {
  if (!WEBHOOK_URL) {
    return {
      success: false,
      error: "Webhook URL is not configured.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${WEBHOOK_URL}/fitness-coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        success: false,
        error: body?.error || `Server error (${res.status})`,
      };
    }

    return (await res.json()) as N8nResponse;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, error: "Request timed out. Please try again." };
    }
    return {
      success: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}
