"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function Bar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const completeTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function onStart() {
      clearTimeout(completeTimer.current);
      clearTimeout(hideTimer.current);
      setOpacity(1);
      setWidth(0);
      // Step up to ~80% in stages to fake progress
      requestAnimationFrame(() => {
        setWidth(20);
        setTimeout(() => setWidth(55), 200);
        setTimeout(() => setWidth(78), 800);
      });
    }
    window.addEventListener("toploader:start", onStart);
    return () => window.removeEventListener("toploader:start", onStart);
  }, []);

  // Route changed → complete the bar
  useEffect(() => {
    if (opacity === 0) return; // not running
    setWidth(100);
    completeTimer.current = setTimeout(() => {
      setOpacity(0);
    }, 250);
    hideTimer.current = setTimeout(() => {
      setWidth(0);
    }, 500);
    return () => {
      clearTimeout(completeTimer.current);
      clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        height: 3,
        width: `${width}%`,
        background: "linear-gradient(90deg, #3b82f6, #6366f1)",
        borderRadius: "0 2px 2px 0",
        opacity,
        transition:
          width === 100
            ? "width 200ms ease-out, opacity 250ms ease 250ms"
            : "width 600ms cubic-bezier(0.1, 0.4, 0.3, 1)",
        pointerEvents: "none",
      }}
    />
  );
}

export function TopLoader() {
  return (
    <Suspense>
      <Bar />
    </Suspense>
  );
}

export function startTopLoader() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("toploader:start"));
  }
}
