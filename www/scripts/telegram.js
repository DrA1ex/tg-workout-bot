export const telegramWebApp = window.Telegram?.WebApp;
export const telegramInitData = telegramWebApp?.initData || "";

if (telegramWebApp) {
    telegramWebApp.ready();
    telegramWebApp.expand();
}



