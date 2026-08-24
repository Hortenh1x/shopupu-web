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
              A portfolio project: production-grade Spring Boot commerce API behind a Next.js storefront,
              with AI where it earns its keep — semantic search, an outfit stylist, review summaries.
              Need something like this built? Get in touch.
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
          <nav aria-label="Project">
            <span className="kicker onDark">Project</span>
            <a href="https://github.com/Hortenh1x/shopupu" target="_blank" rel="noreferrer">
              Backend on GitHub
            </a>
            <a href="https://github.com/Hortenh1x/shopupu-web" target="_blank" rel="noreferrer">
              Frontend on GitHub
            </a>
            <a href="mailto:dmytro.bolibok@gmail.com">Hire me</a>
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
