const MESSAGE_SOURCE = "workout-log-telegram-login";
const params = new URLSearchParams(window.location.search);
const botUsername = String(params.get("bot") || "").replace(/^@/, "").trim();
const root = document.querySelector("#telegram-login-frame-root");

function post(type, payload = {}) {
    window.parent.postMessage({source: MESSAGE_SOURCE, type, ...payload}, window.location.origin);
}

window.onTelegramLogin = user => {
    post("authenticated", {user});
};

if (!botUsername || !/^[A-Za-z0-9_]{5,64}$/.test(botUsername)) {
    post("error", {message: "Telegram bot username is invalid"});
} else {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = "large";
    script.dataset.radius = "8";
    script.dataset.requestAccess = "write";
    script.dataset.onauth = "onTelegramLogin(user)";
    script.addEventListener("error", () => {
        post("error", {message: "Telegram login widget failed to load"});
    }, {once: true});
    root.appendChild(script);
}
