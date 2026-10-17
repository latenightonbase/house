"use client";

import { useEffect, useState } from "react";

export type VisualViewportState = {
  /** Height of the visible area, in px — shrinks when the on-screen keyboard opens. */
  height: number | null;
  /** How far the browser has panned the visible area down the layout viewport. */
  offsetTop: number;
  /** True while an on-screen keyboard is taking up a meaningful part of the screen. */
  keyboardOpen: boolean;
};

/** Anything smaller is browser chrome settling, not a keyboard. */
const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Tracks the part of the page the user can actually see.
 *
 * iOS Safari (and Android Chrome by default) open the keyboard over the page
 * instead of resizing it, and pan the visible area to keep the focused field in
 * view. A fixed layer sized with `100dvh` ends up half behind the keyboard. A
 * layer sized and placed from these numbers stays exactly in the visible gap.
 */
export function useVisualViewport(enabled = true): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    height: null,
    offsetTop: 0,
    keyboardOpen: false,
  });

  useEffect(() => {
    const viewport = typeof window !== "undefined" ? window.visualViewport : null;
    if (!enabled || !viewport) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // The layout viewport does not change with the keyboard, so the gap
        // between the two is the keyboard (plus any pinch zoom, which is rare here).
        const layoutHeight = document.documentElement.clientHeight;
        setState({
          height: viewport.height,
          offsetTop: viewport.offsetTop,
          keyboardOpen: layoutHeight - viewport.height > KEYBOARD_THRESHOLD_PX,
        });
      });
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return state;
}
