import {authApi} from "./api.js";
import {$} from "./dom.js";
import {applyI18n, t} from "./i18n/index.js";
import {state} from "./state.js";
import {telegramInitData} from "./telegram.js";

let callbacks = {
    applyTheme: () => {},
    refreshAll: async () => {},
};

export function configureAuth(nextCallbacks) {
    callbacks = {...callbacks, ...nextCallbacks};
}

function setAuthenticatedShell(isAuthenticated) {
    $(".app-shell").hidden = !isAuthenticated;
    $("#auth-screen").hidden = isAuthenticated;
}

function setAppReady(isReady) {
    state.appReady = isReady;
    const addButton = $("#nav-add");
    if (addButton) {
        addButton.disabled = !isReady;
    }
}

function showAppSkeletonShell() {
    setAppReady(false);
    state.settingsLoaded = false;
    $(".app-shell").hidden = false;
    $("#auth-screen").hidden = true;
    $("#dashboard-skeleton").hidden = false;
    $("#dashboard-content").hidden = true;
}

async function loadAuthConfig() {
    if (!state.authConfig) {
        state.authConfig = await authApi("config");
    }
    return state.authConfig;
}

const TELEGRAM_LOGIN_MESSAGE_SOURCE = "workout-log-telegram-login";
let telegramLoginFrame = null;

async function authenticateTelegramUser(user) {
    try {
        const auth = await authApi("telegram-login", {
            method: "POST",
            body: JSON.stringify(user),
        });
        await completeAuth(auth.user);
    } catch (error) {
        await showAuthScreen(error.message);
    }
}

window.addEventListener("message", event => {
    if (event.origin !== window.location.origin) return;
    if (!telegramLoginFrame || event.source !== telegramLoginFrame.contentWindow) return;
    if (event.data?.source !== TELEGRAM_LOGIN_MESSAGE_SOURCE) return;

    if (event.data.type === "authenticated" && event.data.user) {
        void authenticateTelegramUser(event.data.user);
    } else if (event.data.type === "error" && event.data.message) {
        $("#auth-message").textContent = event.data.message;
    }
});

function renderTelegramLoginWidget(botUsername) {
    const container = $("#telegram-login-widget");
    container.innerHTML = "";
    telegramLoginFrame = null;
    if (!botUsername) return;

    const iframe = document.createElement("iframe");
    iframe.className = "telegram-login-frame";
    iframe.title = "Telegram Login";
    iframe.src = `/telegram-login-widget.html?bot=${encodeURIComponent(botUsername)}`;
    iframe.referrerPolicy = "same-origin";
    iframe.setAttribute("scrolling", "no");
    container.appendChild(iframe);
    telegramLoginFrame = iframe;
}

export async function showAuthScreen(message) {
    setAppReady(false);
    state.settingsLoaded = false;
    setAuthenticatedShell(false);
    applyI18n();
    $("#auth-message").textContent = message || "";

    try {
        const config = await loadAuthConfig();
        renderTelegramLoginWidget(config.botUsername);
        $("#telegram-open-link").href = config.botUsername ? `https://t.me/${config.botUsername}` : "https://t.me/";
        if (!telegramInitData && !config.botUsername) {
            $("#auth-message").textContent = t("auth.configMissing");
        } else if (!message) {
            $("#auth-message").textContent = t("auth.ready");
        }
    } catch (error) {
        $("#auth-message").textContent = error.message || t("auth.configMissing");
    }
}

async function completeAuth(user) {
    state.user = user;
    state.theme = user?.theme || localStorage.getItem("theme") || "system";
    state.accentColor = user?.accentColor || localStorage.getItem("accentColor") || "blue";
    setAuthenticatedShell(true);
    callbacks.applyTheme();
    await callbacks.refreshAll();
}

export async function ensureAuth() {
    showAppSkeletonShell();
    applyI18n();
    $("#auth-message").textContent = t("auth.checking");
    try {
        const status = await authApi("status");
        if (status.authenticated) {
            await completeAuth(status.user);
            return;
        }

        if (telegramInitData) {
            const auth = await authApi("telegram-webapp", {
                method: "POST",
                body: JSON.stringify({initData: telegramInitData}),
            });
            await completeAuth(auth.user);
            return;
        }

        await showAuthScreen();
    } catch (error) {
        await showAuthScreen(error.message);
    }
}

window.onTelegramLogin = user => {
    void authenticateTelegramUser(user);
};
