"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LanguagePicker } from "@/components/layout/LanguagePicker";
import { cartApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

export function Spark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="spark">
      <path d="M12 1c.62 5.9 4.28 9.56 11 11-6.72 1.44-10.38 5.1-11 11-.62-5.9-4.28-9.56-11-11 6.72-1.44 10.38-5.1 11-11Z" />
    </svg>
  );
}

/** True once page content has scrolled underneath the sticky header. */
function useScrolledPast() {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { sentinelRef, scrolled };
}

export function SiteHeader() {
  const { t } = useI18n();
  const auth = useAuth();
  const pathname = usePathname();
  const { sentinelRef, scrolled } = useScrolledPast();
  // shares the CartPage cache entry; guests only after a cart token exists,
  // so anonymous visitors do not spawn server-side carts from the header
  const cart = useSessionQuery({
    queryKey: ["cart", auth.user?.id ?? "guest"],
    queryFn: cartApi.get,
    enabled: auth.isReady && (auth.isAuthenticated || cartApi.hasGuestToken())
  });
  const cartCount = cart.data?.totalItems ?? 0;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* 1px marker just above the header: the scroll-edge shadow appears once it leaves the viewport */}
      <div ref={sentinelRef} aria-hidden style={{ height: 1, marginTop: -1 }} />
      <header className="siteHeader" data-scrolled={scrolled}>
        <div className="headerInner">
          <Link className="wordmark" href="/">
            <Spark />
            shopupu
          </Link>
          <nav className="nav" aria-label={t("nav.main")}>
            <Link href="/catalog" data-active={isActive("/catalog") || isActive("/products")}>
              {t("nav.catalog")}
            </Link>
            <Link href="/cart" data-active={isActive("/cart")}>
              {t("nav.cart")}
              {cartCount > 0 ? <span className="cartCount">{cartCount}</span> : null}
            </Link>
            {auth.isAuthenticated ? (
              <Link href="/orders" data-active={isActive("/orders")}>
                {t("nav.orders")}
              </Link>
            ) : null}
            {auth.isAdmin ? (
              <Link href="/admin" data-active={isActive("/admin")}>
                {t("nav.admin")}
              </Link>
            ) : null}
          </nav>
          <div className="headerActions">
            <LanguagePicker />
            {auth.isAuthenticated ? (
              <>
                <Link
                  className="button buttonSmall"
                  href="/profile"
                  title={auth.user?.email}
                  data-active={isActive("/profile")}
                >
                  {t("nav.account")}
                </Link>
                <button className="navButton" onClick={auth.logout}>
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link className="navButton" href="/login">
                  {t("nav.signIn")}
                </Link>
                <Link className="button buttonDark buttonSmall" href="/register">
                  {t("nav.register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
