import { afterEach, describe, expect, it, vi } from "vitest";
import { appConfig } from "../config";
import type { Assignment } from "../types/domain";
import { assignmentsService } from "./assignmentsService";

afterEach(() => vi.unstubAllGlobals());

const apiAssignment = {
  id: "assignment-1",
  studentId: "student-1",
  studentName: "Noa Cohen",
  subject: "Math",
  teacher: "Yael Levi",
  title: "Fractions practice",
  dueAt: "2026-11-20T09:00:00.000Z",
  status: "TODO" as const,
  description: "Complete questions 1–12.",
};

const assignment: Assignment = {
  ...apiAssignment,
  dueLabel: new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(apiAssignment.dueAt),
  ),
  status: "לביצוע",
  tone: "blue",
};

describe("assignments service", () => {
  it("keeps a list request pending until the API response arrives", async () => {
    let respond: (response: Response) => void = () => undefined;
    const response = new Promise<Response>((resolve) => {
      respond = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(response);
    vi.stubGlobal("fetch", fetchMock);
    const settled = vi.fn();
    const request = assignmentsService.list().then((items) => {
      settled(items);
      return items;
    });

    expect(fetchMock).toHaveBeenCalledWith(`${appConfig.apiUrl}/assignments`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    respond(Response.json([apiAssignment]));
    await expect(request).resolves.toEqual([assignment]);
    expect(settled).toHaveBeenCalledOnce();
  });

  it("sends the completion PATCH request and returns the updated assignment", async () => {
    const completedApiAssignment = { ...apiAssignment, status: "COMPLETED" as const };
    const completed = { ...assignment, status: "הושלם" as const };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(completedApiAssignment));
    vi.stubGlobal("fetch", fetchMock);

    await expect(assignmentsService.markComplete(completed.id)).resolves.toEqual(completed);
    expect(fetchMock).toHaveBeenCalledWith(`${appConfig.apiUrl}/assignments/${completed.id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  });

  it.each([403, 500])("rejects list requests with HTTP status %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status })));
    await expect(assignmentsService.list()).rejects.toThrow(`API request failed: ${status}`);
  });

  it("propagates a failed completion without returning a success result", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(assignmentsService.markComplete("missing")).rejects.toThrow("API request failed: 404");
  });

  it("propagates network errors", async () => {
    const error = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(error));
    await expect(assignmentsService.list()).rejects.toBe(error);
  });

  it("rejects malformed JSON instead of treating it as assignment data", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("invalid json")));
    await expect(assignmentsService.list()).rejects.toMatchObject({ name: "SyntaxError" });
  });
});
