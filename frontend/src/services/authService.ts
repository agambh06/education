import { apiRequest } from "./apiClient";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "PARENT" | "STUDENT" | "TEACHER" | "ADMIN";
}

interface AuthResponse {
  user: AuthUser;
}

export const authService = {
  current: () => apiRequest<AuthResponse>("/auth/me"),
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (input: { email: string; password: string; firstName: string; lastName: string }) =>
    apiRequest<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
};
