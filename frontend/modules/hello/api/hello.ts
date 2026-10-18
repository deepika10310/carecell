import type { HelloResponse } from "@/modules/hello/types/hello";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchHello(signal: AbortSignal): Promise<HelloResponse> {
  const response = await fetch(`${apiUrl}/api/hello`, { signal });
  if (!response.ok) throw new Error("The greeting service returned an error.");

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("message" in data) ||
    typeof data.message !== "string"
  ) {
    throw new Error("The greeting service returned an invalid response.");
  }

  return { message: data.message };
}