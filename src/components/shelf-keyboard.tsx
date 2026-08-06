"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * Shelf keyboard affordances:
 * `/` opens command search · `j`/`k` or arrows move cards · Enter opens · Esc clears
 */
export function ShelfKeyboard({ cardCount }: { cardCount: number }) {
  const indexRef = useRef(-1);

  useEffect(() => {
    indexRef.current = -1;
  }, [cardCount]);

  useEffect(() => {
    function cards(): HTMLElement[] {
      const root = document.getElementById("shelf");
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>("[data-shelf-card]"));
    }

    function focusCard(next: number) {
      const list = cards();
      if (!list.length) return;
      const i = ((next % list.length) + list.length) % list.length;
      indexRef.current = i;
      list.forEach((el, idx) => {
        el.dataset.shelfActive = idx === i ? "true" : "false";
      });
      list[i]?.focus({ preventScroll: false });
      list[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function clearActive() {
      indexRef.current = -1;
      cards().forEach((el) => {
        el.dataset.shelfActive = "false";
      });
    }

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;

      if (e.key === "/" && !editable && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        track("keyboard_shortcut", { key: "/", context: "shelf" });
        window.dispatchEvent(new Event("toolshelf:command"));
        clearActive();
        return;
      }

      if (e.key === "Escape") {
        track("keyboard_shortcut", { key: "esc", context: "shelf" });
        clearActive();
        return;
      }

      if (editable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        track("keyboard_shortcut", {
          key: e.key === "j" ? "j" : "arrow_down",
          context: "shelf",
        });
        focusCard(indexRef.current + 1);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        track("keyboard_shortcut", {
          key: e.key === "k" ? "k" : "arrow_up",
          context: "shelf",
        });
        focusCard(indexRef.current <= 0 ? 0 : indexRef.current - 1);
        return;
      }
      if (e.key === "Enter" && indexRef.current >= 0) {
        const list = cards();
        const el = list[indexRef.current];
        const link = el?.querySelector<HTMLAnchorElement>("a.tool-card-main");
        if (link) {
          track("keyboard_shortcut", { key: "enter", context: "shelf" });
          e.preventDefault();
          link.click();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cardCount]);

  return null;
}
