import { appConfig } from "../config";
export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(appConfig.apiUrl + path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
    ...options,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `API request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
