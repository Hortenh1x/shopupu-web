import Link from "next/link";
import { Spark } from "@/components/layout/SiteHeader";

export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="footerInner">
        <div className="footerCols">
          <div className="stack" style={{ gap: 12, alignContent: "start" }}>
            <span className="wordmark" style={{ color: "inherit" }}>
              <Spark />
              shopupu
            </span>
            <p className="muted" style={{ margin: 0, maxWidth: "38ch" }}>
              A clothing shop set on cream paper: honest sizes, live stock and reviews from people who
              actually bought the thing.
            </p>
          </div>
          <nav aria-label="Shop">
            <span className="kicker onDark">Shop</span>
            <Link href="/catalog">Catalog</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/orders">Orders</Link>
          </nav>
          <nav aria-label="Account">
            <span className="kicker onDark">Account</span>
            <Link href="/profile">Profile</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/register">Create account</Link>
          </nav>
        </div>
        <div className="footerBase">
          <span>&copy; 2026 shopupu</span>
          <span>Set in Bricolage &amp; Inter</span>
        </div>
      </div>
    </footer>
  );
}
