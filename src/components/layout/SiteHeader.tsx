"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cartApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

export function Spark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="spark">
      <path d="M12 1c.62 5.9 4.28 9.56 11 11-6.72 1.44-10.38 5.1-11 11-.62-5.9-4.28-9.56-11-11 6.72-1.44 10.38-5.1 11-11Z" />
    </svg>
  );
}

export function SiteHeader() {
  const auth = useAuth();
  const pathname = usePathname();
  // shares the CartPage cache entry; guests only after a cart token exists,
  // so anonymous visitors do not spawn server-side carts from the header
  const cart = useQuery({
    queryKey: ["cart", auth.user?.id ?? "guest"],
    queryFn: cartApi.get,
    enabled: auth.isReady && (auth.isAuthenticated || cartApi.hasGuestToken())
  });
  const cartCount = cart.data?.totalItems ?? 0;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="siteHeader">
      <div className="headerInner">
        <Link className="wordmark" href="/">
          <Spark />
          shopupu
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/catalog" data-active={isActive("/catalog") || isActive("/products")}>
            Catalog
          </Link>
          <Link href="/cart" data-active={isActive("/cart")}>
            Cart
            {cartCount > 0 ? <span className="cartCount">{cartCount}</span> : null}
          </Link>
          {auth.isAuthenticated ? (
            <Link href="/orders" data-active={isActive("/orders")}>
              Orders
            </Link>
          ) : null}
          {auth.isAdmin ? (
            <Link href="/admin" data-active={isActive("/admin")}>
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="toolbar" style={{ gap: 8 }}>
          {auth.isAuthenticated ? (
            <>
              <Link
                className="button buttonSmall"
                href="/profile"
                title={auth.user?.email}
                data-active={isActive("/profile")}
              >
                Account
              </Link>
              <button className="navButton" onClick={auth.logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="navButton" href="/login">
                Sign in
              </Link>
              <Link className="button buttonDark buttonSmall" href="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
