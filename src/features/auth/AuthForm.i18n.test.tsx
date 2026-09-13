import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/features/auth/AuthForm";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { clearSession, getAccessToken } from "@/lib/auth/session";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { LocaleProvider, useI18n } from "@/lib/i18n/LocaleProvider";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
beforeEach(async () => { await clearSession(); });
function LanguageButton() { const { setLocale } = useI18n(); return <button onClick={() => setLocale("de")}>Deutsch</button>; }

describe("localized authentication preserves its rules", () => {
  it("translates an existing validation error while preserving entered values", async () => {
    render(<LocaleProvider initialLocale="en"><QueryProvider><AuthProvider><LanguageButton /><AuthForm mode="login" /></AuthProvider></QueryProvider></LocaleProvider>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "demo@example.invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Enter your password");
    fireEvent.click(screen.getByRole("button", { name: "Deutsch" }));
    expect(await screen.findByText("Gib dein Passwort ein.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-Mail")).toHaveValue("demo@example.invalid");
    expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument();
  });

  it("keeps German MFA enrollment recovery codes visible until saved", async () => {
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/auth/login", () => jsonResponse(200, { status: "MFA_ENROLLMENT_REQUIRED", challengeToken: "de-challenge", expiresAt: "2099-01-01T12:00:00Z" }));
    mock.on("POST", "/api/v1/auth/mfa/enrollment/start", () => jsonResponse(200, { secret: "LOCAL-TEST-KEY", otpauthUri: "otpauth://test", expiresAt: "2099-01-01T12:00:00Z" }));
    mock.on("POST", "/api/v1/auth/mfa/enrollment/confirm", () => jsonResponse(200, { status: "AUTHENTICATED", accessToken: "de-access", refreshToken: "de-refresh", recoveryCodes: ["recovery-one"] }));
    const profile = vi.fn(() => jsonResponse(200, { id: 1, email: "admin@example.invalid", enabled: true, roles: ["ADMIN"], emailVerified: false }));
    mock.on("GET", "/api/v1/auth/me", profile);
    render(<LocaleProvider initialLocale="de"><QueryProvider><AuthProvider><AuthForm mode="login" /></AuthProvider></QueryProvider></LocaleProvider>);
    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "admin@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Passwort", { exact: true }), { target: { value: "legacy" } });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    fireEvent.click(await screen.findByRole("button", { name: "Einrichtungsschlüssel anzeigen" }));
    await screen.findByText("LOCAL-TEST-KEY");
    fireEvent.change(screen.getByLabelText("Authenticator-Code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Code bestätigen" }));
    await screen.findByText("Speichere deine Wiederherstellungscodes.");
    expect(screen.getByRole("button", { name: "Weiter zum Shop" })).toBeDisabled();
    expect(profile).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    fireEvent.click(screen.getByLabelText("Ich habe meine Wiederherstellungscodes gespeichert"));
    fireEvent.click(screen.getByRole("button", { name: "Weiter zum Shop" }));
    await waitFor(() => expect(getAccessToken()).toBe("de-access"));
    expect(profile).toHaveBeenCalledTimes(1);
  });
});
