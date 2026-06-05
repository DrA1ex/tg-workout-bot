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

async function loadAuthConfig() {
    if (!state.authConfig) {
        state.authConfig = await authApi("config");
    }
    return state.authConfig;
}

function renderTelegramLoginWidget(botUsername) {
    const container = $("#telegram-login-widget");
    container.innerHTML = "";
    if (!botUsername) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = "large";
    script.dataset.radius = "8";
    script.dataset.requestAccess = "write";
    script.dataset.onauth = "onTelegramLogin(user)";
    container.appendChild(script);
}

export async function showAuthScreen(message) {
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
    state.theme = localStorage.getItem("theme") || user?.theme || "system";
    setAuthenticatedShell(true);
    callbacks.applyTheme();
    await callbacks.refreshAll();
}

export async function ensureAuth() {
    setAuthenticatedShell(false);
    applyI18n();
    $("#auth-message").textContent = t("auth.checking");
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
}

window.onTelegramLogin = async user => {
    try {
        const auth = await authApi("telegram-login", {
            method: "POST",
            body: JSON.stringify(user),
        });
        await completeAuth(auth.user);
    } catch (error) {
        await showAuthScreen(error.message);
    }
};
