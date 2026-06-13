import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AuthNavbar } from "./AuthNavbar";

interface AuthLayoutProps {
  children: ReactNode;
  className?: string;
  /** Max-width of the centered content column (Tailwind class). */
  maxWidthClassName?: string;
  /** Forwarded to AuthNavbar. */
  showLogout?: boolean;
  hideNavButton?: boolean;
  showBothButtons?: boolean;
  /** Custom left-side content for the navbar (defaults to the POS logo). */
  navLeftSlot?: ReactNode;
  /**
   * Optional narrative/marketing panel rendered beside the content in a responsive
   * 2-column split (e.g. the brand story on registration). When omitted, the layout
   * stays a single centered column.
   */
  aside?: ReactNode;
}

/**
 * Auth/onboarding page shell: a fixed AuthNavbar on top and a centered,
 * max-width content column underneath. Built purely from POS primitives + classes.
 */
export function AuthLayout({
  children,
  className,
  maxWidthClassName = "max-w-md",
  showLogout,
  hideNavButton,
  showBothButtons,
  navLeftSlot,
  aside,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AuthNavbar
        leftSlot={navLeftSlot}
        showLogout={showLogout}
        hideNavButton={hideNavButton}
        showBothButtons={showBothButtons}
      />
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-10">
        {aside ? (
          <div className={cn("w-full mx-auto max-w-5xl grid lg:grid-cols-2 gap-8 items-center", className)}>
            {/* Form stays on top on mobile; story sits to the left on desktop. */}
            <div className="order-last lg:order-first">{aside}</div>
            <div>{children}</div>
          </div>
        ) : (
          <div className={cn("w-full mx-auto", maxWidthClassName, className)}>{children}</div>
        )}
      </main>
    </div>
  );
}
