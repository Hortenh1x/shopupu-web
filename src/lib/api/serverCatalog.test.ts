import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerProduct } from "@/lib/api/serverCatalog";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("react", async (original) => ({ ...await original<object>(), cache: (fn: unknown) => fn }));

describe("server product status", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("returns a semantic 404 for invalid IDs without contacting the backend", async () => {
    const mock = installFetchMock();
    await expect(getServerProduct("invalid")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mock.requests).toHaveLength(0);
  });

  it("preserves the backend 404 for missing products", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/catalog/products/999", () => jsonResponse(404));
    await expect(getServerProduct("999")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("allows the error boundary to recover from an unavailable backend", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/catalog/products/1", () => jsonResponse(503));
    await expect(getServerProduct("1")).rejects.toThrow("temporarily unavailable");
  });
});
