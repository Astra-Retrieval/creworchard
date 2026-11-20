import Link from "next/link";
import { Logo } from "./Logo";
import { PARENT_COMPANY, PARENT_URL, PRODUCT_NAME } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Logo size={28} wordSize={13} />
        <div className="footer-links">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/waitlist">Waitlist</Link>
          <Link href="/signin">Sign in</Link>
        </div>
        <p className="footer-parent" style={{ width: "100%", margin: 0 }}>
          {PRODUCT_NAME} is a product of{" "}
          <a href={PARENT_URL} target="_blank" rel="noopener noreferrer">
            {PARENT_COMPANY}
          </a>
          <span style={{ color: "var(--mint)" }}> · The logistics layer for deep space.</span>
        </p>
        <p className="footer-legal">
          © {year} {PARENT_COMPANY}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
