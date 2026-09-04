"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const revealSelector = ".reveal-on-scroll";

export function ScrollAnimator() {
  const pathname = usePathname();

  useEffect(() => {
    const revealElements = () =>
      Array.from(document.querySelectorAll<HTMLElement>(revealSelector));

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      revealElements().forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.14,
      },
    );

    const observeVisibleTargets = () => {
      revealElements().forEach((element) => {
        if (element.classList.contains("is-visible")) return;

        observer.observe(element);
      });
    };

    const frame = window.requestAnimationFrame(observeVisibleTargets);
    const mutationObserver = new MutationObserver(observeVisibleTargets);

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
