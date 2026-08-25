"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/features/catalog/ProductCard";
import { aiApi } from "@/lib/api/shop";
import type { StylistHistoryMessage, StylistSlot } from "@/lib/api/types";

type ChatEntry = {
  role: "user" | "assistant";
  content: string;
  slots?: StylistSlot[];
  unavailable?: string[];
};

const QUICK_PROMPTS = [
  "Something formal for a business meeting tonight",
  "Casual outfit for a rainy day",
  "Warm layers for a cold evening walk"
];

const GREETING =
  "Hi! Tell me where you're headed — a business meeting, a date, a hike in the rain — and I'll put an outfit together from the catalog.";

const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 380;

type PanelSize = { width: number; height: number };

export function StylistWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [size, setSize] = useState<PanelSize | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const resizeOrigin = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const chat = useMutation({
    mutationFn: ({ message, history }: { message: string; history: StylistHistoryMessage[] }) =>
      aiApi.stylistChat(message, history),
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply, slots: response.slots, unavailable: response.unavailable }
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't reach the stylist right now. Try again in a moment." }
      ]);
    }
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, chat.isPending, open]);

  // shop-only assistant: stays out of the admin panel
  if (pathname?.startsWith("/admin")) return null;

  const send = (raw: string) => {
    const message = raw.trim().slice(0, 500);
    if (!message || chat.isPending) return;
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

  return (
    <>
      {open ? (
        <section
          ref={panelRef}
          aria-label="AI stylist chat"
          className="card"
          style={{
            position: "fixed",
            right: 20,
            bottom: 86,
            zIndex: 60,
            width: size ? `min(${size.width}px, calc(100vw - 32px))` : "min(390px, calc(100vw - 32px))",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            ...(size
              ? { height: `min(${size.height}px, calc(100vh - 120px))` }
              : { maxHeight: "min(560px, calc(100vh - 120px))" }),
            padding: 0,
            overflow: "hidden",
            boxShadow: "var(--shadow-lift)"
          }}
        >
          <div
            aria-hidden
            title="Drag to resize"
            onPointerDown={beginResize}
            onPointerMove={resizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 22,
              height: 22,
              cursor: "nwse-resize",
              touchAction: "none",
              zIndex: 1
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              style={{ position: "absolute", top: 4, left: 4 }}
            >
              <path d="M1 9 9 1 M1 5 5 1" stroke="var(--ink-mute)" strokeWidth="1.4" fill="none" />
            </svg>
          </div>
          <header style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontFamily: "var(--font-head)" }}>Stylist.</strong>
            <span className="muted" style={{ marginLeft: 8, fontSize: "0.85rem" }}>
              outfit ideas from the catalog
            </span>
          </header>

          <div ref={scrollRef} className="stack" style={{ gap: 10, padding: 16, overflowY: "auto" }}>
            <Bubble role="assistant">{GREETING}</Bubble>
            {messages.map((entry, index) => (
              <div key={index} className="stack" style={{ gap: 8 }}>
                <Bubble role={entry.role}>{entry.content}</Bubble>
                {entry.unavailable?.length ? (
                  <span className="muted" style={{ fontSize: "0.82rem" }}>
                    Not in the catalog: {entry.unavailable.join(", ")}
                  </span>
                ) : null}
                {entry.slots?.map((slot) => (
                  <div key={slot.slot} className="stack" style={{ gap: 6 }}>
                    <span className="kicker">{slot.slot}</span>
                    {slot.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        style={{
                          display: "flex",
                          gap: 10,
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
                <span className="muted">Picking pieces…</span>
              </Bubble>
            ) : null}
            {!messages.length ? (
              <div className="stack" style={{ gap: 6 }}>
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="button buttonSmall"
                    style={{ justifySelf: "start", textAlign: "left" }}
                    onClick={() => send(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form
            style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Where are you headed?"
              value={input}
              maxLength={500}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="button buttonDark" disabled={chat.isPending || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="button buttonDark"
        aria-expanded={open}
        aria-label={open ? "Close stylist chat" : "Open stylist chat"}
        style={{ position: "fixed", right: 20, bottom: 24, zIndex: 60, borderRadius: 999, boxShadow: "var(--shadow-lift)" }}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close" : "✦ Stylist"}
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
