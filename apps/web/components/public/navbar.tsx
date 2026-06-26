"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Menu, LogOut } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Our Work", href: "/portfolio" },
  { label: "Our Clients", href: "/clients" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setLoggedIn(!!data.session);
    }
    checkSession();
  }, [supabase]);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 h-16 flex items-center transition-colors duration-200",
        scrolled
          ? "bg-white border-b border-border"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-brand-dark">
          Creo
        </Link>

        <ul className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-medium text-brand-dark/70 hover:text-brand-dark transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-4">
          {loggedIn ? (
            <>
              <Link
                href="/portal"
                className={buttonVariants({
                  className: "bg-brand text-white hover:bg-brand/90 rounded-lg px-5 h-9",
                })}
              >
                Portal
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 text-sm font-medium text-brand-dark/70 hover:text-brand-dark transition-colors"
              >
                <LogOut className="size-4" />
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-brand-dark/70 hover:text-brand-dark transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({
                  className: "bg-brand text-white hover:bg-brand/90 rounded-lg px-5 h-9",
                })}
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden" />
            }
          >
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  render={
                    <Link
                      href={link.href}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-dark/80 hover:bg-brand-light hover:text-brand-dark transition-colors"
                    />
                  }
                >
                  {link.label}
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 px-4 pb-6">
              {loggedIn ? (
                <>
                  <Link
                    href="/portal"
                    className={buttonVariants({
                      className:
                        "bg-brand text-white hover:bg-brand/90 rounded-lg w-full h-10",
                    })}
                  >
                    Portal
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-center text-sm font-medium text-brand-dark/70 hover:bg-brand-light transition-colors"
                  >
                    <LogOut className="size-4" />
                    {loggingOut ? "Logging out..." : "Log out"}
                  </button>
                </>
              ) : (
                <>
                  <SheetClose
                    render={
                      <Link
                        href="/login"
                        className="block rounded-lg px-3 py-2.5 text-center text-sm font-medium text-brand-dark/70 hover:bg-brand-light transition-colors"
                      />
                    }
                  >
                    Log In
                  </SheetClose>
                  <Link
                    href="/signup"
                    className={buttonVariants({
                      className:
                        "bg-brand text-white hover:bg-brand/90 rounded-lg w-full h-10",
                    })}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
