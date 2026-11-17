const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");

if (!import.meta.env.DEV && !configuredApiUrl) {
  throw new Error("VITE_API_URL must be set for production builds.");
}

if (
  !import.meta.env.DEV &&
  configuredApiUrl &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredApiUrl)
) {
  throw new Error("VITE_API_URL cannot point to localhost in production.");
}

export const appConfig = {
  apiUrl: configuredApiUrl || "http://localhost:4000/api",
} as const;
