import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { clearSession, setTokens } from "@/lib/auth/session";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => ({
  user: { id: 1, email: "demo@example.invalid", roles: ["CUSTOMER"], emailVerified: false }, reloadUser: vi.fn()
}) }));
beforeEach(async () => { await clearSession(); setTokens({ accessToken: "access-a", refreshToken: "refresh-a" }); });
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ProfileForm /></QueryClientProvider>); }

describe("verification email availability", () => {
  it("disables resend when delivery is explicitly unavailable", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/storefront/config", () => jsonResponse(200, { email: { available: false } }));
    mount();
    await screen.findByText(/Email delivery is disabled/);
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeDisabled();
    expect(mock.sent("POST", "/api/v1/auth/resend-verification")).toHaveLength(0);
  });
  it("shows a 503 as an error without claiming the email was requested", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/storefront/config", () => jsonResponse(200, { email: { available: true } }));
    mock.on("POST", "/api/v1/auth/resend-verification", () => jsonResponse(503, { code: "EMAIL_DELIVERY_UNAVAILABLE", detail: "Email delivery is unavailable" }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    // EMAIL_DELIVERY_UNAVAILABLE is rendered through the localized error map, not the raw API detail.
    expect(await screen.findByRole("alert")).toHaveTextContent("Email delivery is not connected in this demo. No message was sent.");
    expect(screen.queryByText(/Verification email requested/)).not.toBeInTheDocument();
  });
});
