"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { authApi } from "@/lib/api/shop";

export default function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const request = useMutation({
    mutationFn: (value: string) => authApi.forgotPassword(value),
    // the endpoint is intentionally silent about whether the account exists
    onSettled: () => setSent(true)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    request.mutate(email.trim());
  }

  if (sent) {
    return (
      <main className="page">
        <section className="brutal stack" style={{ maxWidth: 520, margin: "40px auto", padding: 28 }}>
          <h1 className="title">Check your inbox</h1>
          <p className="subhead">If the account exists, a reset code was sent.</p>
          <div className="toolbar">
            <Link className="button buttonDark" href="/reset-password">
              I have a code
            </Link>
            <Link className="button" href="/login">
              Back to login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="brutal stack" style={{ maxWidth: 520, margin: "40px auto", padding: 28 }}>
        <h1 className="title">Forgot password</h1>
        <p className="muted">Enter your account email and we will send a reset code.</p>
        <form className="stack" onSubmit={submit}>
          <label className="label">
            Email
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button className="button buttonDark" disabled={request.isPending}>
            Send reset code
          </button>
        </form>
        <p className="muted">
          <Link href="/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
