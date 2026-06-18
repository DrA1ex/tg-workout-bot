// Extracted from main.js without changing feature behavior.
import {setFormControlValue} from '../../core/utils.js';
import {$, $$, applyTheme, state} from '../../deps.js';
import {renderSettingsExerciseSummary} from './exercises.js';

export function setSettingsPending(pending) {
    state.savingSettings = pending;
    const saveButton = $("#settings-save-button");
    saveButton.disabled = pending;
    saveButton.classList.toggle("loading", pending);
}

export function renderSettings() {
    const isLoading = !state.settingsLoaded;
    $("#settings-skeleton").hidden = !isLoading;
    $("#settings-form").hidden = isLoading;
    if (isLoading || !state.user) return;

    setFormControlValue($("#language-select"), state.user.language);
    setFormControlValue($("#timezone-input"), state.settingsDraft?.timezone ?? state.user.timezone);
    setFormControlValue($("#theme-select"), state.theme);
    $$("#accent-select [data-accent-color]").forEach(button => {
        button.classList.toggle("active", button.dataset.accentColor === (state.accentColor || "blue"));
    });
    renderSettingsExerciseSummary();
    setSettingsPending(Boolean(state.savingSettings));
}

export function updateSettingsPreview() {
    state.theme = $("#theme-select").value;
    state.accentColor = $("#accent-select [data-accent-color].active")?.dataset.accentColor || state.accentColor || "blue";
    localStorage.setItem("theme", state.theme);
    localStorage.setItem("accentColor", state.accentColor);
    applyTheme();
    renderSettings();
}
