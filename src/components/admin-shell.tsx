"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoutOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { logout } from "@/lib/api";
import { brand } from "@/lib/brand";

const SCROLL_THRESHOLD = 28;

const AdminHeaderSolidContext = createContext(true);

/** Use inside AdminShell `extra` to match icon colors when the header is transparent vs solid. */
export function useAdminHeaderSolid() {
  return useContext(AdminHeaderSolidContext);
}

export function AdminNewProductButton() {
  const solid = useAdminHeaderSolid();
  const iconColor = solid ? "#ffffff" : brand.primary;

  return (
    <Link
      href="/products/new"
      aria-label="New product"
      className="admin-header-interactive flex h-10 w-10 items-center justify-center rounded-full no-underline sm:ml-0"
    >
      <PlusOutlined style={{ fontSize: 22, color: iconColor }} aria-hidden />
    </Link>
  );
}

export function AdminBackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="admin-header-interactive admin-header-link inline-flex items-center rounded-full px-3 py-1.5 text-sm no-underline"
    >
      {children}
    </Link>
  );
}

const contentMaxWidth = {
  narrow: "max-w-3xl",
  wide: "max-w-6xl",
} as const;

const navLinks = [
  { href: "/products", label: "Catalogue" },
  { href: "/orders", label: "Orders" },
] as const;

export function AdminShell({
  title,
  children,
  extra,
  contentWidth = "narrow",
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  contentWidth?: "narrow" | "wide";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const maxW = contentMaxWidth[contentWidth];
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled;

  const headerFg = solid ? "#ffffff" : brand.primary;
  const headerHoverBg = solid ? "rgba(255, 255, 255, 0.1)" : "rgba(111, 78, 55, 0.12)";

  const headerStyle = {
    ["--admin-header-fg" as string]: headerFg,
    ["--admin-header-hover-bg" as string]: headerHoverBg,
    backgroundColor: solid ? "rgba(28, 25, 23, 0.92)" : "transparent",
  };

  function navLinkClass(active: boolean) {
    const base =
      "admin-header-interactive admin-header-link inline-flex items-center rounded-full px-3 py-1.5 no-underline";
    if (solid) {
      return `${base}${active ? " bg-white/15" : ""}`;
    }
    return `${base}${active ? " bg-hek-primary/10" : ""}`;
  }

  const logoClass =
    "admin-header-logo shrink-0 font-serif text-xl tracking-wide no-underline transition-colors duration-300 sm:text-2xl";

  const adminBadgeClass = solid
    ? "hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium tracking-wide text-white/70 sm:inline"
    : "hidden shrink-0 rounded-full bg-hek-primary/10 px-2 py-0.5 text-xs font-medium tracking-wide text-hek-primary sm:inline";

  const logoutIconColor = solid ? "#ffffff" : brand.primary;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <AdminHeaderSolidContext.Provider value={solid}>
      <div className="min-h-screen bg-hek-bg">
        <header
          data-admin-header
          style={headerStyle}
          className={`fixed inset-x-0 top-0 z-50 border-b px-4 py-3 transition-[background-color,border-color,box-shadow,color] duration-300 sm:px-6 ${
            solid ? "border-white/10 shadow-sm backdrop-blur-md" : "border-transparent"
          }`}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
              <Link href="/products" className={logoClass}>
                Home Essentials by Kamgol
              </Link>
              <span className={adminBadgeClass}>Admin</span>
              <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm sm:gap-2 sm:text-base">
                {navLinks.map((link) => {
                  const active =
                    pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <Link key={link.href} href={link.href} className={navLinkClass(active)}>
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {extra}
              <Button
                type="text"
                aria-label="Log out"
                icon={<LogoutOutlined style={{ fontSize: 22, color: logoutIconColor }} />}
                onClick={handleLogout}
                className="admin-header-interactive flex! h-10! w-10! min-w-10! items-center justify-center rounded-full! border-0! shadow-none!"
              />
            </div>
          </div>
        </header>
        <main className={`mx-auto w-full px-4 pb-6 pt-4 sm:px-6 ${maxW}`}>
          <h1 className="mb-6 pt-14 font-serif text-2xl tracking-wide text-hek-ink sm:pt-16">
            {title}
          </h1>
          {children}
        </main>
      </div>
    </AdminHeaderSolidContext.Provider>
  );
}
