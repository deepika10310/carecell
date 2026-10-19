export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getErrorMessage(response: Response): Promise<string> {
  const data: unknown = await response.json().catch(() => null);
  return typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
    ? data.detail
    : "The assistant couldn't respond. Please try again.";
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${apiUrl}/api/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error(await getErrorMessage(response));
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || !("message" in data) || typeof data.message !== "string") {
    throw new Error("The assistant returned an invalid response.");
  }
  return data.message;
}
