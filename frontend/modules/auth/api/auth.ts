import type { AuthUser, Credentials, RegistrationDetails } from "@/modules/auth/types/auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function sendAuthRequest(path: string, payload?: Credentials | RegistrationDetails): Promise<AuthUser | null> {
  const response = await fetch(`${apiUrl}/api/auth/${path}`, {
    method: "POST",
    credentials: "include",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const detail = typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
      ? data.detail
      : "We couldn't complete that request. Please try again.";
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return (await response.json()) as AuthUser;
}

export async function login(credentials: Credentials): Promise<AuthUser> {
  const user = await sendAuthRequest("login", credentials);
  if (!user) throw new Error("The sign-in response was incomplete.");
  return user;
}

export async function register(details: RegistrationDetails): Promise<AuthUser> {
  const user = await sendAuthRequest("register", details);
  if (!user) throw new Error("The account creation response was incomplete.");
  return user;
}

export async function logout(): Promise<void> {
  await sendAuthRequest("logout");
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await fetch(`${apiUrl}/api/auth/me`, { credentials: "include" });
  if (!response.ok) throw new Error("Your session has expired. Please sign in again.");
  return (await response.json()) as AuthUser;
}