import * as React from "react";

/**
 * Radix returns focus on close only to a <DialogTrigger>. Most dialogs here are opened from a plain
 * button with `open={…}`, so focus fell to <body> (UX-M4). This remembers what had focus when the
 * dialog opened and puts focus back there on close, unless the caller handled it or that element is gone.
 * `fallback` names the opener when nothing had focus (Safari/iOS do not focus a tapped button).
 */
export function useReturnFocus(onCloseAutoFocus?: (event: Event) => void, fallback?: () => HTMLElement | null) {
  const opener = React.useRef<HTMLElement | null>(null);

  // rendered inside the dialog content: its layout effect runs before Radix moves focus in
  const Capture = React.useCallback(function Capture() {
    React.useLayoutEffect(() => {
      const active = document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    }, []);
    return null;
  }, []);

  const handleCloseAutoFocus = (event: Event) => {
    onCloseAutoFocus?.(event);
    if (event.defaultPrevented) return;
    const target = opener.current ?? fallback?.() ?? null;
    opener.current = null;
    if (target && target.isConnected) {
      event.preventDefault();
      target.focus();
    }
  };

  return { Capture, onCloseAutoFocus: handleCloseAutoFocus };
}
