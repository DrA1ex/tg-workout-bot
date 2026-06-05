export const telegramWebApp = window.Telegram?.WebApp;
export const telegramInitData = telegramWebApp?.initData || "";

function insetValue(source, key) {
    const value = Number(source?.[key] || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function setCssPx(name, value) {
    document.documentElement.style.setProperty(name, `${Math.round(value)}px`);
}

function applyTelegramSafeArea() {
    if (!telegramWebApp) return;

    const safeArea = telegramWebApp.safeAreaInset || {};
    const contentSafeArea = telegramWebApp.contentSafeAreaInset || {};

    setCssPx("--tg-safe-area-top", insetValue(safeArea, "top"));
    setCssPx("--tg-safe-area-right", insetValue(safeArea, "right"));
    setCssPx("--tg-safe-area-bottom", insetValue(safeArea, "bottom"));
    setCssPx("--tg-safe-area-left", insetValue(safeArea, "left"));
    setCssPx("--tg-content-safe-area-top", insetValue(contentSafeArea, "top"));
    setCssPx("--tg-content-safe-area-right", insetValue(contentSafeArea, "right"));
    setCssPx("--tg-content-safe-area-bottom", insetValue(contentSafeArea, "bottom"));
    setCssPx("--tg-content-safe-area-left", insetValue(contentSafeArea, "left"));
}

if (telegramWebApp) {
    document.documentElement.classList.add("telegram-webapp");
    telegramWebApp.ready();
    telegramWebApp.expand();
    applyTelegramSafeArea();

    telegramWebApp.onEvent?.("safeAreaChanged", applyTelegramSafeArea);
    telegramWebApp.onEvent?.("contentSafeAreaChanged", applyTelegramSafeArea);
    telegramWebApp.onEvent?.("viewportChanged", applyTelegramSafeArea);
}


