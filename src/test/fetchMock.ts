import { vi } from "vitest";

export type RecordedRequest = {
  url: string;
  method: string;
  headers: Headers;
  /** JSON-parsed string bodies; FormData and friends pass through untouched. */
  body: unknown;
};

type RouteHandler = (request: RecordedRequest) => Response | Promise<Response>;

type Route = {
  method: string;
  path: string;
  handler: RouteHandler;
  once: boolean;
};

export function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

/**
 * Replaces global fetch with a route table for the duration of one test.
 * Routes match by HTTP method + substring of the URL, in registration order;
 * `once` routes are consumed on first hit, so "401 first, then 200" flows are
 * expressed by registering the once-route before the persistent one.
 */
export function installFetchMock() {
  const requests: RecordedRequest[] = [];
  const routes: Route[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    let body: unknown = init?.body ?? null;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // keep the raw string
      }
    }
    const request: RecordedRequest = { url, method, headers: new Headers(init?.headers), body };
    requests.push(request);

    const index = routes.findIndex((route) => route.method === method && url.includes(route.path));
    if (index === -1) {
      throw new Error(`fetchMock: no route for ${method} ${url}`);
    }
    const route = routes[index];
    if (route.once) {
      routes.splice(index, 1);
    }
    return route.handler(request);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    requests,
    on(method: string, path: string, handler: RouteHandler) {
      routes.push({ method: method.toUpperCase(), path, handler, once: false });
    },
    once(method: string, path: string, handler: RouteHandler) {
      routes.push({ method: method.toUpperCase(), path, handler, once: true });
    },
    sent(method: string, path: string) {
      return requests.filter((r) => r.method === method.toUpperCase() && r.url.includes(path));
    }
  };
}
