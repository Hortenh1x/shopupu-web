"use client";

import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Spark } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n/LocaleProvider";
import { aiApi } from "@/lib/api/shop";
import type { Gender, StylistHistoryMessage, StylistSlot } from "@/lib/api/types";
import { useSheetDismiss } from "./useSheetDismiss";

type ChatEntry = {
  role: "user" | "assistant";
  content: string;
  slots?: StylistSlot[];
  unavailable?: string[];
  degraded?: boolean;
};

const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 380;
const SHEET_QUERY = "(max-width: 767px)";

type PanelSize = { width: number; height: number };

const isSheetLayout = () => typeof window !== "undefined" && window.matchMedia(SHEET_QUERY).matches;

export function StylistWidget() {
  const { t, formatPrice, genderLabel } = useI18n();
  const quickPrompts = [t("stylist.promptMeeting"), t("stylist.promptRain"), t("stylist.promptCold")];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [budget, setBudget] = useState("");
  const budgetValid = budget === "" || (Number.isFinite(Number(budget)) && Number(budget) >= 0 && Number(budget) <= 999999.99);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [size, setSize] = useState<PanelSize | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const resizeOrigin = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const chat = useSessionMutation({
    mutationFn: ({ message, history }: { message: string; history: StylistHistoryMessage[] }) =>
      aiApi.stylistChat(message, history, { gender: gender || undefined, maxTotalPrice: budget === "" ? undefined : Number(budget) }),
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply, slots: response.slots, unavailable: response.unavailable, degraded: response.degraded }
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("stylist.error") }
      ]);
    }
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, chat.isPending, open]);

  // keyboards get focus straight away; on touch the sheet opens without
  // summoning the on-screen keyboard over the quick prompts
  useEffect(() => {
    if (open && window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, [open]);

  // keep the panel above the on-screen keyboard: fixed positioning follows the
  // layout viewport, which iOS/Android no longer shrink when the keyboard shows
  useEffect(() => {
    const panel = panelRef.current;
    const viewport = window.visualViewport;
    if (!open || !panel || !viewport) return;
    const apply = () => {
      const offset = Math.max(0, window.innerHeight - (viewport.offsetTop + viewport.height));
      panel.style.setProperty("--vv-offset", `${Math.round(offset)}px`);
      panel.style.setProperty("--vv-height", `${Math.round(viewport.height)}px`);
    };
    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
      panel.style.removeProperty("--vv-offset");
      panel.style.removeProperty("--vv-height");
    };
  }, [open]);

  const close = () => { setOpen(false); launcherRef.current?.focus(); };

  const grip = useSheetDismiss({ panelRef, enabled: isSheetLayout, onDismiss: close });

  // shop-only assistant: stays out of the admin panel
  if (pathname?.startsWith("/admin")) return null;

  const send = (raw: string) => {
    const message = raw.trim().slice(0, 500);
    if (!message || chat.isPending || !budgetValid) return;
    // history = conversation before this message, oldest first, capped for the API
    const history: StylistHistoryMessage[] = messages
      .slice(-10)
      .map((entry) => ({ role: entry.role, content: entry.content.slice(0, 1000) }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    chat.mutate({ message, history });
  };

  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    resizeOrigin.current = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // synthetic pointer events carry ids capture can reject; drag still works
    }
  };

  const resizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = resizeOrigin.current;
    if (!origin) return;
    // panel is anchored bottom-right, so dragging the top-left corner away enlarges it
    const width = origin.width + (origin.x - event.clientX);
    const height = origin.height + (origin.y - event.clientY);
    setSize({
      width: Math.min(Math.max(width, MIN_PANEL_WIDTH), window.innerWidth - 36),
      height: Math.min(Math.max(height, MIN_PANEL_HEIGHT), window.innerHeight - 110)
    });
  };

  const endResize = () => {
    resizeOrigin.current = null;
  };

  const preferences = [
    gender ? genderLabel(gender) : null,
    budget !== "" && budgetValid ? t("stylist.budgetShort", { amount: formatPrice(Number(budget)) }) : null
  ].filter(Boolean);

  return (
    <>
      <section
        id="stylist-chat"
        ref={panelRef}
        aria-label={t("stylist.chatLabel")}
        className="stylistPanel"
        data-open={open}
        data-resized={size != null}
        onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}
        style={size ? { "--panel-w": `${size.width}px`, "--panel-h": `${size.height}px` } as React.CSSProperties : undefined}
      >
        <div className="sheetGrip" aria-hidden title={t("stylist.grip")} {...grip} />
        <div
          aria-hidden
          className="stylistResize"
          title={t("stylist.resize")}
          onPointerDown={beginResize}
          onPointerMove={resizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: "absolute", top: 4, left: 4 }}>
            <path d="M1 9 9 1 M1 5 5 1" stroke="var(--ink-mute)" strokeWidth="1.4" fill="none" />
          </svg>
        </div>
        <header className="stylistHead">
          <strong style={{ fontFamily: "var(--font-head)" }}>{t("stylist.title")}</strong>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {t("stylist.subtitle")}
          </span>
          <button type="button" className="button buttonSmall stylistClose" aria-label={t("stylist.close")} onClick={close}>
            &times;
          </button>
        </header>

        <div ref={scrollRef} className="stack" role="log" aria-label={t("stylist.conversation")} aria-live="polite" style={{ gap: 12, padding: 16, overflowY: "auto" }}>
          <p className="muted">{t("stylist.notice")}</p>
          <Bubble role="assistant">{t("stylist.greeting")}</Bubble>
          {messages.map((entry, index) => (
            <div key={index} className="stack" style={{ gap: 8 }}>
              <Bubble role={entry.role}>{entry.content}</Bubble>
              {entry.degraded ? <span className="muted">{t("stylist.fallback")}</span> : null}
              {entry.unavailable?.length ? (
                <span className="muted" style={{ fontSize: "0.82rem" }}>
                  {t("stylist.unavailable", { items: entry.unavailable.join(", ") })}
                </span>
              ) : null}
              {entry.slots?.map((slot) => (
                <div key={slot.slot} className="stack" style={{ gap: 8 }}>
                  <span className="kicker">{slot.slot}</span>
                  {slot.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: 8,
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        background: "var(--surface)",
                        textDecoration: "none",
                        color: "inherit"
                      }}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.imageAltText ?? product.title}
                          width={44}
                          height={44}
                          style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : null}
                      <span style={{ display: "grid" }}>
                        <strong style={{ fontSize: "0.9rem" }}>{product.title}</strong>
                        <span className="mono muted" style={{ fontSize: "0.82rem" }}>
                          {formatPrice(product.price)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {chat.isPending ? (
            <Bubble role="assistant">
              <span className="muted">{t("stylist.picking")}</span>
            </Bubble>
          ) : null}
          {!messages.length ? (
            <div className="stack" style={{ gap: 8 }}>
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="button buttonSmall"
                  style={{ justifySelf: "start", textAlign: "left" }}
                  onClick={() => send(prompt)}
                  disabled={chat.isPending || !budgetValid}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <form
          className="stack"
          style={{ gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          {/* the message is the common path; collection and budget sit one level deeper */}
          <details className="stylistPrefs">
            <summary>
              {t("stylist.preferences")}
              {preferences.length ? <span className="prefsValue">· {preferences.join(" · ")}</span> : null}
            </summary>
            <div className="toolbar" style={{ flexWrap: "wrap", marginTop: 8 }}>
              <label className="label" style={{ flex: 1 }}>{t("stylist.collection")}
                <select className="select" value={gender} onChange={(event) => setGender(event.target.value as Gender | "")}>
                  <option value="">{t("stylist.fromMessage")}</option><option value="MEN">{genderLabel("MEN")}</option><option value="WOMEN">{genderLabel("WOMEN")}</option><option value="UNISEX">{genderLabel("UNISEX")}</option><option value="KIDS">{genderLabel("KIDS")}</option>
                </select>
              </label>
              <label className="label" style={{ flex: 1 }}>{t("stylist.budget")}
                <input className="input" type="number" min="0" max="999999.99" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} aria-invalid={!budgetValid} />
              </label>
            </div>
          </details>
          <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            aria-label={t("stylist.message")}
            className="input"
            style={{ flex: 1 }}
            placeholder={t("stylist.placeholder")}
            value={input}
            maxLength={500}
            onChange={(event) => setInput(event.target.value)}
          />
          <button className="button buttonDark" disabled={chat.isPending || !input.trim() || !budgetValid}>
            {t("stylist.send")}
          </button>
          </div>
        </form>
      </section>

      <button
        ref={launcherRef}
        type="button"
        className="stylistLauncher"
        aria-expanded={open}
        aria-controls="stylist-chat"
        aria-label={open ? t("stylist.close") : t("stylist.open")}
        onClick={() => open ? close() : setOpen(true)}
      >
        <span className="labelSwap">
          <span data-active={!open}>
            <Spark size={14} />
            {t("stylist.launcher")}
          </span>
          <span data-active={open}>{t("common.close")}</span>
        </span>
      </button>
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <p
      style={{
        margin: 0,
        maxWidth: "85%",
        justifySelf: isUser ? "end" : "start",
        padding: "8px 12px",
        borderRadius: 14,
        fontSize: "0.92rem",
        lineHeight: 1.45,
        background: isUser ? "var(--primary-deep)" : "var(--tint-accent)",
        color: isUser ? "var(--cream-on-dark)" : "inherit"
      }}
    >
      {children}
    </p>
  );
}
