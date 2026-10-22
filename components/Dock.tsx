"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [["/", "~", "Home"], ["/dashboard", "docs", "My documents"], ["/verify", "verify", "Verify a student"], ["/school", "school", "School review"], ["/login", "login", "Sign in"]] as const;

export default function Dock() {
  const path = usePathname();
  return (
    <nav className="dock" aria-label="Main">
      {items.map(([href, label, title]) => (
        <Link key={href} href={href} title={title} aria-current={path === href ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
