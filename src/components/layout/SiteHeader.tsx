"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";

export function SiteHeader() {
  const auth = useAuth();

  return (
    <header className="siteHeader">
      <Link className="wordmark" href="/">
        shopupu
      </Link>
      <nav className="nav">
        <Link href="/catalog">Catalog</Link>
        <Link href="/cart">Cart</Link>
        <Link href="/orders">Orders</Link>
        {auth.isAdmin ? <Link href="/admin">Admin</Link> : null}
        {auth.isAuthenticated ? (
          <>
            <Link href="/profile">{auth.user?.email}</Link>
            <button className="navButton" onClick={auth.logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
