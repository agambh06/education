import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import { after, before } from "node:test";

export function setupTestApi() {
  let server: Server | undefined;
  let baseUrl: string;

  before(async () => {
    // Override local settings before dotenv and the app's eager env validation run.
    Object.assign(process.env, {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/education_api_test",
      CORS_ORIGIN: "http://localhost:5173",
      PORT: "4000",
    });
    const { app } = await import("../src/app.js");
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    const activeServer = server;
    if (activeServer) {
      await new Promise<void>((resolve, reject) => {
        activeServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  return async function requestJson<T>(path: string, expectedStatus: number, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      signal: AbortSignal.timeout(5000),
      ...options,
    });
    assert.equal(response.status, expectedStatus, `${options.method ?? "GET"} ${path}`);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    return (await response.json()) as T;
  };
}

export function jsonBody(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export interface ValidationError {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
}
