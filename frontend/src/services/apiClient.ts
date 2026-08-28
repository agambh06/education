import { appConfig } from "../config";
export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(appConfig.apiUrl + path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) throw new Error("API request failed: " + response.status);
  return response.json() as Promise<T>;
}
