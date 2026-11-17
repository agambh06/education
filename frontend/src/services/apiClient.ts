import { appConfig } from "../config";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message = `API request failed: ${status}`) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(appConfig.apiUrl + path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
    ...options,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    throw new ApiError(response.status, typeof body?.message === "string" ? body.message : undefined);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
