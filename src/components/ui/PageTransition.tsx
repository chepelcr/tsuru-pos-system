import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Returns true when both paths belong to the same logical page section.
 * Used to skip the fade animation when navigating between sub-routes
 * (e.g., switching tabs inside the document editor).
 */
function isSameSection(a: string, b: string): boolean {
  // Same exact path — definitely same section
  if (a === b) return true;

  // Entire documents area (list + all editor sub-routes) is one section —
  // the DocumentsContainer animates its own content swap internally
  if (a.startsWith("/dashboard/documents") && b.startsWith("/dashboard/documents")) return true;

  // Product / client detail routes — sub-route param changes shouldn't re-animate
  const detailSections = ["/dashboard/products/", "/dashboard/clients/"];
  for (const prefix of detailSections) {
    if (a.startsWith(prefix) && b.startsWith(prefix)) return true;
  }

  return false;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<"fadeIn" | "fadeOut">("fadeIn");

  useEffect(() => {
    if (location === displayLocation) return;

    // Same-section sub-route change — swap instantly, no animation
    if (isSameSection(displayLocation, location)) {
      setDisplayLocation(location);
      return;
    }

    // Different section — run the fade out, then in
    setTransitionStage("fadeOut");
  }, [location, displayLocation]);

  return (
    <div
      style={{
        animation: transitionStage === "fadeOut" ? "fadeOut 0.15s ease-out" : "fadeIn 0.5s ease-out",
        opacity: transitionStage === "fadeOut" ? 0 : 1,
      }}
      onAnimationEnd={() => {
        if (transitionStage === "fadeOut") {
          setDisplayLocation(location);
          setTransitionStage("fadeIn");
        }
      }}
    >
      {children}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
