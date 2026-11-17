import { appConfig } from "../config";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`API request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(appConfig.apiUrl + path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
