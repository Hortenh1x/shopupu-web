import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { clearSession, getAccessToken, getCartToken, setCartToken, setCurrentUser, setTokens } from "@/lib/auth/session";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";
import { AuthForm } from "@/features/auth/AuthForm";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function AccountScreen() {
  const auth = useAuth();
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: async () => `Private order for ${auth.user?.email}`,
    enabled: auth.isAuthenticated
  });
  return <>
    <button onClick={() => auth.login("a@example.invalid", "test-password").catch(() => undefined)}>Login A</button>
    <button onClick={() => auth.login("b@example.invalid", "test-password").catch(() => undefined)}>Login B</button>
    <button onClick={auth.logout}>Logout</button>
    <p>Account: {auth.user?.email ?? "none"}</p>
    {auth.isAuthenticated ? <p>{orders.data}</p> : null}
  </>;
}

function mount() {
  return render(<QueryProvider><AuthProvider><AccountScreen /></AuthProvider></QueryProvider>);
}

describe("account boundaries", () => {
  beforeEach(() => clearSession());

  it("does not reuse another account's fresh private query data after logout and login", async () => {
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/auth/login", ({ body }) => {
      const email = (body as { email: string }).email;
      return jsonResponse(200, { accessToken: email, refreshToken: `refresh-${email}` });
    });
    mock.on("GET", "/api/v1/auth/me", ({ headers }) => {
      const email = headers.get("Authorization")?.replace("Bearer ", "");
      return jsonResponse(200, { id: email?.startsWith("a") ? 1 : 2, email, roles: ["CUSTOMER"] });
    });
    mock.on("POST", "/api/v1/auth/logout", () => jsonResponse(204));
    mount();

    fireEvent.click(screen.getByText("Login A"));
    await screen.findByText("Private order for a@example.invalid");
    fireEvent.click(screen.getByText("Logout"));
    await screen.findByText("Account: none");
    fireEvent.click(screen.getByText("Login B"));

    await screen.findByText("Account: b@example.invalid");
    await screen.findByText("Private order for b@example.invalid");
    expect(screen.queryByText("Private order for a@example.invalid")).not.toBeInTheDocument();
  });

  it("does not apply a login response after the user has logged out", async () => {
    const mock = installFetchMock();
    let release!: (response: Response) => void;
    mock.on("POST", "/api/v1/auth/login", () => new Promise<Response>((resolve) => { release = resolve; }));
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(200, { id: 1, email: "a@example.invalid", roles: ["CUSTOMER"] }));
    mount();
    fireEvent.click(screen.getByText("Login A"));
    await waitFor(() => expect(release).toBeTypeOf("function"));
    fireEvent.click(screen.getByText("Logout"));
    await act(async () => {
      release(jsonResponse(200, { accessToken: "account-a", refreshToken: "refresh-a" }));
    });

    expect(screen.getByText("Account: none")).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });

  it("keeps a failed login form mounted so its error is visible", async () => {
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/auth/login", () => jsonResponse(401, { detail: "Invalid credentials" }));
    render(<QueryProvider><AuthProvider><AuthForm mode="login" /></AuthProvider></QueryProvider>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("navigates to registration confirmation after the session subtree remounts", async () => {
    push.mockClear();
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/auth/register", () => jsonResponse(200, { accessToken: "registered", refreshToken: "registered-refresh" }));
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(200, { id: 3, email: "new@example.invalid", roles: ["CUSTOMER"] }));
    render(<QueryProvider><AuthProvider><AuthForm mode="register" /></AuthProvider></QueryProvider>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "A quiet registration meadow" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "A quiet registration meadow" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/welcome"));
  });
  it("does not request a profile or start a session before privileged MFA completes", async () => {
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/auth/login", () => jsonResponse(200, {
      status: "MFA_REQUIRED", challengeToken: "opaque-challenge", expiresAt: new Date(Date.now() + 300000).toISOString()
    }));
    const me = vi.fn(() => jsonResponse(200, { id: 1, email: "admin@example.invalid", roles: ["ADMIN"] }));
    mock.on("GET", "/api/v1/auth/me", me);
    mock.on("POST", "/api/v1/auth/mfa/verify", () => jsonResponse(200, {
      status: "AUTHENTICATED", accessToken: "mfa-access", refreshToken: "mfa-refresh"
    }));
    render(<QueryProvider><AuthProvider><AuthForm mode="login" /></AuthProvider></QueryProvider>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "old" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Verify your sign-in.");
    expect(me).not.toHaveBeenCalled(); expect(getAccessToken()).toBeNull();
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
    await waitFor(() => expect(getAccessToken()).toBe("mfa-access"));
    expect(me).toHaveBeenCalledTimes(1);
  });

  it("keeps one-time recovery codes visible until saved before publishing the session", async () => {
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/auth/login", () => jsonResponse(200, {
      status: "MFA_ENROLLMENT_REQUIRED", challengeToken: "enrollment-challenge", expiresAt: new Date(Date.now() + 300000).toISOString()
    }));
    mock.on("POST", "/api/v1/auth/mfa/enrollment/start", () => jsonResponse(200, {
      secret: "LOCAL-TEST-SECRET", otpauthUri: "otpauth://test", expiresAt: new Date(Date.now() + 300000).toISOString()
    }));
    mock.on("POST", "/api/v1/auth/mfa/enrollment/confirm", () => jsonResponse(200, {
      status: "AUTHENTICATED", accessToken: "enrolled-access", refreshToken: "enrolled-refresh", recoveryCodes: ["recovery-one", "recovery-two"]
    }));
    const me = vi.fn(() => jsonResponse(200, { id: 1, email: "admin@example.invalid", roles: ["ADMIN"] }));
    mock.on("GET", "/api/v1/auth/me", me);
    render(<QueryProvider><AuthProvider><AuthForm mode="login" /></AuthProvider></QueryProvider>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "legacy" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.click(await screen.findByRole("button", { name: "Show setup key" }));
    await screen.findByText("LOCAL-TEST-SECRET");
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
    await screen.findByText("Save your recovery codes.");
    expect(me).not.toHaveBeenCalled(); expect(getAccessToken()).toBeNull();
    expect(screen.getByRole("button", { name: "Continue to store" })).toBeDisabled();
    expect(JSON.stringify(window.localStorage)).not.toContain("recovery-one");
    expect(JSON.stringify(window.localStorage)).not.toContain("LOCAL-TEST-SECRET");
    fireEvent.click(screen.getByLabelText("I have saved my recovery codes"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to store" }));
    await waitFor(() => expect(getAccessToken()).toBe("enrolled-access"));
  });

  it("rejects login callbacks retained from a provider unmounted by logout", async () => {
    const mock = installFetchMock();
    const loginRequest = vi.fn(() => jsonResponse(200, { accessToken: "late", refreshToken: "late" }));
    mock.on("POST", "/api/v1/auth/login", loginRequest);
    let retainedLogin!: ReturnType<typeof useAuth>["login"];
    function CaptureAuth() { retainedLogin = useAuth().login; return null; }
    render(<QueryProvider><AuthProvider><CaptureAuth /></AuthProvider></QueryProvider>);
    const stale = retainedLogin;
    await act(async () => { await clearSession(); });
    await expect(stale("a@example.invalid", "old-password")).rejects.toThrow("session changed");
    expect(loginRequest).not.toHaveBeenCalled();
  });

  it("preserves a newer guest cart created while the original login awaits MFA", async () => {
    setCartToken("guest-original");
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/auth/login", () => jsonResponse(200, {
      status: "MFA_REQUIRED", challengeToken: "guest-mfa", expiresAt: new Date(Date.now() + 300000).toISOString()
    }));
    mock.on("POST", "/api/v1/auth/mfa/verify", () => jsonResponse(200, { status: "AUTHENTICATED", accessToken: "mfa-access", refreshToken: "mfa-refresh" }));
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(200, { id: 1, email: "admin@example.invalid", roles: ["ADMIN"] }));
    render(<QueryProvider><AuthProvider><AuthForm mode="login" /></AuthProvider></QueryProvider>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "legacy" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Verify your sign-in.");
    expect(mock.sent("POST", "/api/v1/auth/login")[0].headers.get("X-Cart-Token")).toBe("guest-original");
    setCartToken("guest-new");
    fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
    await waitFor(() => expect(getAccessToken()).toBe("mfa-access"));
    expect(getCartToken()).toBe("guest-new");
  });

  it("does not let a retained A logout callback revoke or clear B", async () => {
    const mock = installFetchMock();
    const logoutRequest = vi.fn(() => jsonResponse(204));
    mock.on("POST", "/api/v1/auth/logout", logoutRequest);
    let retainedLogout!: ReturnType<typeof useAuth>["logout"];
    function CaptureLogout() { retainedLogout = useAuth().logout; return null; }
    render(<QueryProvider><AuthProvider><CaptureLogout /></AuthProvider></QueryProvider>);
    const stale = retainedLogout;
    await act(async () => {
      await clearSession();
      setTokens({ accessToken: "access-b", refreshToken: "refresh-b" });
      setCurrentUser({ id: 2, email: "b@example.invalid", enabled: true, emailVerified: false, roles: ["CUSTOMER"] });
    });
    stale();
    expect(logoutRequest).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access-b");
  });

});
