// Extracted from main.js without changing feature behavior.
import {EXERCISE_SAVE_LOADER_DELAY, EXERCISE_SAVE_MIN_LOADER_VISIBLE, EXERCISE_SAVE_SUCCESS_VISIBLE, WORKOUT_SAVE_LOADER_DELAY, WORKOUT_SAVE_MIN_LOADER_VISIBLE, WORKOUT_SAVE_SUCCESS_VISIBLE} from './core/config.js';
import {navigateTab} from './core/navigation.js';
import {runtime} from './core/runtime.js';
import {createDelayedLoader, delay, nextAnimationFrame, normalizeTimezoneInputValue} from './core/utils.js';
import {refreshAll} from './data/refresh.js';
import {$, $$, api, applyI18n, applyTheme, authApi, showAuthScreen, state} from './deps.js';
import {renderDashboard} from './features/dashboard/index.js';
import {addGlobalExercise, deleteExercise, findExercise, loadGlobalExercises, openExerciseAddDialog, openExerciseAddDialogWithName, openExerciseDialog, renderExerciseScope, renderExercises, saveExerciseNotes, setExerciseAddPending, syncExerciseState} from './features/exercises/catalog.js';
import {setupHistoryInfiniteScroll} from './features/history/index.js';
import {completeOnboarding, loadOnboardingGlobalExercises, onboardingSelectedSet, openOnboardingIfNeeded, renderOnboardingGlobalExercises, renderOnboardingSearchState, saveOnboardingLanguage, updateOnboardingStartState} from './features/onboarding/index.js';
import {loadProgress, renderProgress} from './features/progress/index.js';
import {isSettingsExercisesDialogOpen, loadSettingsGlobalExercises, openSettingsExercisesDialog, renderSettingsExerciseSearchState} from './features/settings/exercises.js';
import {renderSettings, setSettingsPending, updateSettingsPreview} from './features/settings/index.js';
import {deleteWorkout} from './features/workouts/actions.js';
import {adjustNumberInput, applyPreviousWorkoutValues, currentWorkoutDedupeToken, openDatePicker, openEditDialog, readWorkoutFormValues, refreshWorkoutFormModes, releaseNativeSelect, saveEditedWorkout, setWorkoutFormMode, triggerSuccessHaptic, updatePreviousWorkoutSummary, updateWorkoutFormState, workoutFormFields} from './features/workouts/forms.js';
import {findWorkout} from './features/workouts/presentation.js';
import {addWorkoutToLoadedState} from './features/workouts/state.js';
import {bindModalDialog, bindSheetDialog, closeModalDialog, closeSheetDialog, resolveDeleteConfirmation, setDeleteWorkoutPending, showToast} from './ui/dialogs.js';
import {closeSwipeRows} from './ui/swipe.js';

export function bindEvents() {
    $$("[data-tab]").forEach(button => button.addEventListener("click", () => navigateTab(button.dataset.tab)));
    setupHistoryInfiniteScroll();

    $("#workout-notes").addEventListener("input", event => {
        $("#notes-count").textContent = String(event.target.value.length);
    });

    $("#edit-notes").addEventListener("input", event => {
        $("#edit-notes-count").textContent = String(event.target.value.length);
    });

    $("#workout-form").addEventListener("submit", async event => {
        event.preventDefault();
        if (state.savingWorkout || state.workoutSubmitted) return;

        const saveMode = event.submitter?.dataset.saveMode || "finish";
        state.savingWorkout = true;
        state.workoutSaveLoading = false;
        state.workoutSubmitted = false;
        updateWorkoutFormState();
        const loader = createDelayedLoader({
            delayMs: WORKOUT_SAVE_LOADER_DELAY,
            minVisibleMs: WORKOUT_SAVE_MIN_LOADER_VISIBLE,
            show: () => {
                state.workoutSaveLoading = true;
                updateWorkoutFormState();
            },
        });

        try {
            const workoutDate = $("#workout-date").value;
            const workout = await api("workouts", {
                method: "POST",
                body: JSON.stringify({
                    ...readWorkoutFormValues("workout"),
                    deduplicationToken: currentWorkoutDedupeToken(),
                }),
            });
            loader.cancel();
            await loader.waitForMinVisible();
            addWorkoutToLoadedState(workout, workoutDate);
            state.savingWorkout = false;
            state.workoutSaveLoading = false;
            state.workoutSubmitted = true;
            updateWorkoutFormState();
            triggerSuccessHaptic();
            await delay(WORKOUT_SAVE_SUCCESS_VISIBLE);
            if (saveMode === "finish") {
                navigateTab("dashboard");
            } else {
                navigateTab("add");
                $("#workout-exercise").focus();
            }
        } catch (error) {
            loader.cancel();
            await loader.waitForMinVisible();
            console.error(error);
            showToast("toast.saveFailed", {variant: "danger"});
        } finally {
            loader.cancel();
            if (!state.workoutSubmitted) {
                state.savingWorkout = false;
                state.workoutSaveLoading = false;
                updateWorkoutFormState();
            }
        }
    });

    $("#exercise-form").addEventListener("submit", async event => {
        event.preventDefault();
        if (state.savingExercise) return;
        const createdName = $("#exercise-name").value.trim();
        const createdNotes = $("#exercise-notes").value.trim();
        setExerciseAddPending(true, {loading: false});
        let loaderShownAt = 0;
        const loaderTimer = window.setTimeout(() => {
            loaderShownAt = Date.now();
            setExerciseAddPending(true, {loading: true});
        }, EXERCISE_SAVE_LOADER_DELAY);
        const waitForMinLoaderVisible = async () => {
            if (!loaderShownAt) return;
            await delay(Math.max(0, EXERCISE_SAVE_MIN_LOADER_VISIBLE - (Date.now() - loaderShownAt)));
        };

        try {
            if ($("#onboarding-dialog").open) {
                const duplicate = [
                    ...state.exercises,
                    ...state.onboardingGlobalExercises,
                    ...state.onboardingCustomExercises,
                ].some(exercise => exercise.name.toLowerCase() === createdName.toLowerCase());
                if (duplicate) {
                    window.clearTimeout(loaderTimer);
                    await waitForMinLoaderVisible();
                    showToast("toast.exerciseDuplicate", {variant: "danger"});
                    return;
                }

                await api("exercises/global", {
                    method: "POST",
                    body: JSON.stringify({name: createdName}),
                });

                state.onboardingCustomExercises = [
                    {name: createdName, notes: createdNotes, onboardingCustom: true},
                    ...state.onboardingCustomExercises,
                ];
                state.onboardingGlobalExercises = [
                    {name: createdName, added: false},
                    ...state.onboardingGlobalExercises.filter(exercise => exercise.name !== createdName),
                ];
                const selected = onboardingSelectedSet();
                selected.add(createdName);
                state.onboardingSelectedExercises = [...selected];
                window.clearTimeout(loaderTimer);
                await waitForMinLoaderVisible();
                renderOnboardingGlobalExercises();
                setExerciseAddPending(true, {loading: false, saved: true});
                triggerSuccessHaptic();
                await delay(EXERCISE_SAVE_SUCCESS_VISIBLE);
                closeModalDialog($("#exercise-add-dialog"));
                $("#exercise-form").reset();
                setExerciseAddPending(false);
                return;
            }

            const data = await api("exercises", {
                method: "POST",
                body: JSON.stringify({
                    name: createdName,
                    notes: createdNotes,
                }),
            });
            window.clearTimeout(loaderTimer);
            await waitForMinLoaderVisible();
            const animateSettings = isSettingsExercisesDialogOpen();
            await syncExerciseState(data.exercises, {
                renderSettingsList: !animateSettings,
            });
            renderExercises();
            setExerciseAddPending(true, {loading: false, saved: true});
            triggerSuccessHaptic();
            await delay(EXERCISE_SAVE_SUCCESS_VISIBLE);
            closeModalDialog($("#exercise-add-dialog"));
            $("#exercise-form").reset();
            setExerciseAddPending(false);
            if (animateSettings) {
                await nextAnimationFrame();
                await loadSettingsGlobalExercises({animate: true});
            }
        } catch (error) {
            window.clearTimeout(loaderTimer);
            await waitForMinLoaderVisible();
            console.error(error);
            showToast(error.status === 409 ? "toast.exerciseDuplicate" : "toast.saveFailed", {variant: "danger"});
        } finally {
            window.clearTimeout(loaderTimer);
            if (state.savingExercise) setExerciseAddPending(false);
        }
    });

    let exerciseSearchTimer;
    $("#exercise-search").addEventListener("input", event => {
        state.exerciseSearch = event.target.value.trim();
        window.clearTimeout(exerciseSearchTimer);
        exerciseSearchTimer = window.setTimeout(async () => {
            if (state.exerciseScope === "global") {
                await loadGlobalExercises();
            } else {
                renderExercises();
            }
        }, 220);
    });

    $$("#exercise-scope button").forEach(button => button.addEventListener("click", async () => {
        state.exerciseScope = button.dataset.scope;
        renderExerciseScope();
        if (state.exerciseScope === "global") {
            await loadGlobalExercises();
        }
    }));

    $("#progress-exercise").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        loadProgress();
    });
    $$("#progress-metric button").forEach(button => button.addEventListener("click", () => {
        state.progressMetric = button.dataset.metric;
        $$("#progress-metric button").forEach(item => item.classList.toggle("active", item === button));
        renderProgress();
    }));
    $("#progress-period").addEventListener("change", async event => {
        releaseNativeSelect(event.currentTarget);
        state.progressPeriod = event.target.value;
        await loadProgress();
    });

    $("#settings-form").addEventListener("submit", async event => {
        event.preventDefault();
        if (state.savingSettings) return;
        const timezone = normalizeTimezoneInputValue($("#timezone-input").value);
        setSettingsPending(true);
        try {
            const data = await api("settings", {
                method: "PATCH",
                body: JSON.stringify({
                    language: $("#language-select").value,
                    timezone,
                    theme: state.theme,
                    accentColor: state.accentColor,
                }),
            });
            state.user = data.user;
            state.settingsDraft = null;
            state.theme = data.user.theme || state.theme;
            state.accentColor = data.user.accentColor || state.accentColor;
            updateSettingsPreview();
            applyTheme();
            await refreshAll();
            showToast("toast.settingsSaved");
        } catch (error) {
            showToast(error.status === 400 ? "toast.invalidTimezone" : "toast.saveFailed", {variant: "danger"});
        } finally {
            setSettingsPending(false);
        }
    });
    $("#theme-select").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        updateSettingsPreview();
    });
    $("#accent-select").addEventListener("click", event => {
        const button = event.target.closest("[data-accent-color]");
        if (!button) return;
        $$("#accent-select [data-accent-color]").forEach(item => item.classList.toggle("active", item === button));
        updateSettingsPreview();
    });
    $("#language-select").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        if (state.user) state.user = {...state.user, language: $("#language-select").value};
        applyI18n();
        if (state.dashboard) renderDashboard();
        refreshWorkoutFormModes();
        if (state.progressLoaded) renderProgress();
    });
    $("#timezone-input").addEventListener("blur", event => {
        event.currentTarget.value = normalizeTimezoneInputValue(event.currentTarget.value);
        state.settingsDraft = {...(state.settingsDraft || {}), timezone: event.currentTarget.value};
    });
    $("#timezone-input").addEventListener("input", event => {
        state.settingsDraft = {...(state.settingsDraft || {}), timezone: event.currentTarget.value};
    });

    $("#settings-exercises-open").addEventListener("click", openSettingsExercisesDialog);
    bindSheetDialog("#settings-exercises-dialog", "#settings-exercises-close");
    $("#settings-exercises-dialog").addEventListener("close", () => {
        if (state.exercises.length) return;
        requestAnimationFrame(() => openOnboardingIfNeeded());
    });
    $("#onboarding-close").addEventListener("click", () => closeSheetDialog($("#onboarding-dialog")));
    $("#onboarding-dialog").addEventListener("close", () => {
        window.clearTimeout(runtime.onboardingExerciseSearchTimer);
        window.clearTimeout(runtime.onboardingLanguageTimer);
        window.clearTimeout(runtime.onboardingMoveTimer);
        delete $("#onboarding-dialog").dataset.dialogOpenOrder;
        document.body.classList.remove("sheet-open");
    });
    $("#onboarding-language-select").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        if (state.user) state.user = {...state.user, language: event.currentTarget.value};
        $("#language-select").value = event.currentTarget.value;
        applyI18n();
        refreshWorkoutFormModes();
        updateOnboardingStartState();
        window.clearTimeout(runtime.onboardingLanguageTimer);
        runtime.onboardingLanguageTimer = window.setTimeout(() => {
            saveOnboardingLanguage().catch(console.error);
        }, 200);
    });
    $("#onboarding-exercise-search").addEventListener("input", event => {
        state.onboardingSearch = event.target.value.trim();
        state.onboardingSearchPending = true;
        state.onboardingLoading = false;
        runtime.onboardingGlobalRequestSeq += 1;
        renderOnboardingSearchState();
        window.clearTimeout(runtime.onboardingExerciseSearchTimer);
        runtime.onboardingExerciseSearchTimer = window.setTimeout(() => {
            loadOnboardingGlobalExercises({reset: true}).catch(console.error);
        }, 180);
    });
    $("#onboarding-exercise-scroll").addEventListener("scroll", event => {
        const node = event.currentTarget;
        if (node.scrollTop + node.clientHeight >= node.scrollHeight - 120) {
            loadOnboardingGlobalExercises().catch(console.error);
        }
    }, {passive: true});
    $("#onboarding-exercise-list").addEventListener("click", event => {
        const addSearchButton = event.target.closest("[data-onboarding-add-search]");
        if (addSearchButton) {
            openExerciseAddDialogWithName(state.onboardingSearch);
            return;
        }

        const button = event.target.closest("[data-onboarding-exercise]");
        if (!button || button.disabled) return;
        const selected = onboardingSelectedSet();
        const name = button.dataset.onboardingExercise;
        if (selected.has(name)) {
            selected.delete(name);
        } else {
            selected.add(name);
        }
        state.onboardingSelectedExercises = [...selected];
        window.clearTimeout(runtime.onboardingMoveTimer);
        renderOnboardingGlobalExercises({preserveOrder: true});
        runtime.onboardingMoveTimer = window.setTimeout(() => {
            renderOnboardingGlobalExercises({animate: true});
        }, 160);
    });
    $("#onboarding-start-button").addEventListener("click", () => completeOnboarding().catch(console.error));
    $("#settings-exercise-search").addEventListener("input", event => {
        state.settingsExerciseSearch = event.target.value.trim();
        state.settingsExerciseSearchPending = true;
        state.settingsExerciseLoading = false;
        state.settingsGlobalExercises = [];
        state.settingsExerciseNextOffset = 0;
        state.settingsExerciseHasMore = true;
        runtime.settingsGlobalRequestSeq += 1;
        renderSettingsExerciseSearchState();
        window.clearTimeout(runtime.settingsExerciseSearchTimer);
        runtime.settingsExerciseSearchTimer = window.setTimeout(() => {
            loadSettingsGlobalExercises().catch(console.error);
        }, 180);
    });
    $("#settings-exercise-scroll").addEventListener("scroll", event => {
        const node = event.currentTarget;
        if (node.scrollTop + node.clientHeight >= node.scrollHeight - 120) {
            loadSettingsGlobalExercises({append: true}).catch(console.error);
        }
    }, {passive: true});

    $("#logout-button").addEventListener("click", async () => {
        await authApi("logout", {method: "POST"});
        state.user = null;
        state.settingsLoaded = false;
        renderSettings();
        await showAuthScreen();
        showToast("toast.loggedOut");
    });

    $("#use-previous").addEventListener("click", async () => {
        try {
            await applyPreviousWorkoutValues();
        } catch (error) {
            console.error(error);
        }
    });

    $("#workout-exercise").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        updatePreviousWorkoutSummary().catch(console.error);
    });
    $("#edit-exercise").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
    });

    $$(".date-field .field-shell").forEach(shell => {
        shell.addEventListener("click", event => {
            if (event.target.closest("input[type='date']")) return;
            const input = event.currentTarget.querySelector("input[type='date']");
            openDatePicker(input);
        });
    });

    document.addEventListener("click", event => {
        const stepButton = event.target.closest("[data-step-target]");
        if (!stepButton) return;

        const input = document.getElementById(stepButton.dataset.stepTarget);
        if (input) adjustNumberInput(input, Number.parseFloat(stepButton.dataset.step));
    });

    ["workout", "edit"].forEach(prefix => {
        workoutFormFields(prefix).hasWeight.addEventListener("change", () => setWorkoutFormMode(prefix, {
            hasWeight: workoutFormFields(prefix).hasWeight.checked,
            isTime: workoutFormFields(prefix).isTime.checked,
        }));
        workoutFormFields(prefix).isTime.addEventListener("change", () => setWorkoutFormMode(prefix, {
            hasWeight: workoutFormFields(prefix).hasWeight.checked,
            isTime: workoutFormFields(prefix).isTime.checked,
        }));
    });
    bindSheetDialog("#edit-dialog", "#edit-close");
    $("#edit-form").addEventListener("submit", async event => {
        event.preventDefault();
        await saveEditedWorkout();
    });
    $("#edit-save-button").addEventListener("click", async event => {
        event.preventDefault();
        await saveEditedWorkout();
    });
    $("#delete-workout-cancel").addEventListener("click", () => {
        if (state.deletingWorkout) return;
        $("#delete-workout-dialog").close();
        resolveDeleteConfirmation(false);
    });
    $("#delete-workout-confirm").addEventListener("click", () => {
        if (state.deletingWorkout) return;
        if (runtime.deleteConfirmCloseOnConfirm) {
            resolveDeleteConfirmation(true);
            $("#delete-workout-dialog").close();
            return;
        }
        setDeleteWorkoutPending(true);
        resolveDeleteConfirmation(true);
    });
    $("#delete-workout-dialog").addEventListener("cancel", event => {
        if (!state.deletingWorkout) return;
        event.preventDefault();
    });
    $("#delete-workout-dialog").addEventListener("close", () => {
        delete $("#delete-workout-dialog").dataset.dialogOpenOrder;
        runtime.deleteConfirmCloseOnConfirm = false;
        if (state.deletingWorkout) return;
        setDeleteWorkoutPending(false);
        resolveDeleteConfirmation(false);
    });
    $("#exercise-add-open").addEventListener("click", openExerciseAddDialog);
    bindModalDialog("#exercise-add-dialog", "#exercise-add-close");
    bindModalDialog("#exercise-dialog", "#exercise-close");
    $("#exercise-edit-form").addEventListener("submit", async event => {
        event.preventDefault();
        await saveExerciseNotes();
    });
    $("#exercise-edit-save").addEventListener("click", async event => {
        event.preventDefault();
        await saveExerciseNotes();
    });
    document.addEventListener("click", async event => {
        const quickAddButton = event.target.closest("[data-action='quick-add']");
        if (quickAddButton) {
            if (!state.appReady) return;
            navigateTab("add");
            return;
        }

        const deleteButton = event.target.closest("[data-delete-workout]");
        if (deleteButton) {
            closeSwipeRows();
            await deleteWorkout(deleteButton.dataset.deleteWorkout);
            return;
        }

        const editButton = event.target.closest("[data-edit-workout]");
        if (editButton) {
            const swipeRow = editButton.closest(".swipe-workout-row");
            if (swipeRow?.dataset.suppressClick === "true") return;
            if (swipeRow?.classList.contains("open")) {
                swipeRow.classList.remove("open");
                swipeRow.style.removeProperty("--swipe-main-padding-right");
                swipeRow.style.removeProperty("--swipe-action-offset");
                swipeRow.style.removeProperty("--swipe-main-shift");
                swipeRow.style.removeProperty("--swipe-main-height");
                swipeRow.style.removeProperty("--swipe-title-lines");
                return;
            }
            const workout = findWorkout(editButton.dataset.editWorkout);
            if (workout) {
                try {
                    openEditDialog(workout);
                } catch (error) {
                    console.error(error);
                    showToast("toast.editOpenFailed");
                }
            }
            return;
        }

        const editExerciseButton = event.target.closest("[data-edit-exercise]");
        if (editExerciseButton) {
            const swipeRow = editExerciseButton.closest(".swipe-workout-row");
            if (swipeRow?.dataset.suppressClick === "true") return;
            if (swipeRow?.classList.contains("open")) {
                swipeRow.classList.remove("open");
                swipeRow.style.removeProperty("--swipe-main-padding-right");
                swipeRow.style.removeProperty("--swipe-action-offset");
                swipeRow.style.removeProperty("--swipe-main-shift");
                swipeRow.style.removeProperty("--swipe-main-height");
                swipeRow.style.removeProperty("--swipe-title-lines");
                return;
            }
            const exercise = findExercise(editExerciseButton.dataset.editExercise);
            if (exercise) openExerciseDialog(exercise);
            return;
        }

        const settingsAddSearchButton = event.target.closest("[data-settings-add-search]");
        if (settingsAddSearchButton) {
            openExerciseAddDialogWithName(state.settingsExerciseSearch);
            return;
        }

        const deleteExerciseButton = event.target.closest("[data-delete-exercise]");
        if (deleteExerciseButton) {
            closeSwipeRows();
            await deleteExercise(deleteExerciseButton.dataset.deleteExercise);
            return;
        }

        const addGlobalButton = event.target.closest("[data-add-global-exercise]");
        if (addGlobalButton) {
            await addGlobalExercise(addGlobalButton.dataset.addGlobalExercise);
        }
    });
}
