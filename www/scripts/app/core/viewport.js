// Extracted from main.js without changing feature behavior.

export function updateViewportInsets() {
    const viewport = window.visualViewport;
    const active = document.activeElement;
    const inputFocused = active?.matches?.("input, textarea, select, [contenteditable='true']");
    const viewportLoss = viewport ? window.innerHeight - viewport.height : 0;
    document.body.classList.toggle("keyboard-open", Boolean(inputFocused && viewportLoss > 120));
    document.documentElement.style.setProperty("--viewport-bottom-offset", "0px");
}

export function bindViewportInsets() {
    updateViewportInsets();
    window.addEventListener("resize", updateViewportInsets, {passive: true});
    window.addEventListener("focusin", updateViewportInsets, {passive: true});
    window.addEventListener("focusout", () => window.setTimeout(updateViewportInsets, 0), {passive: true});
    window.visualViewport?.addEventListener("resize", updateViewportInsets, {passive: true});
    window.visualViewport?.addEventListener("scroll", updateViewportInsets, {passive: true});
}
