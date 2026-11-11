export const appConfig = {
  apiUrl:
    import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "") ||
    (import.meta.env.DEV ? "http://localhost:4000/api" : "/api"),
} as const;
