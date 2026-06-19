import {state, setUnauthorizedHandler, configureAuth, ensureAuth, showAuthScreen, $, applyTheme} from './app/deps.js';
import {todayInputValue} from './app/core/utils.js';
import {tabFromUrl, setTab, bindHistoryNavigation, registerServiceWorker} from './app/core/navigation.js';
import {bindViewportInsets} from './app/core/viewport.js';
import {refreshAll} from './app/data/refresh.js';
import {setWorkoutFormMode, bindNativeSelectFocusRelease, bindWorkoutValidation} from './app/features/workouts/forms.js';
import {bindEvents} from './app/events.js';
import {bindPullToRefresh} from './app/ui/pull-refresh.js';
import {bindWorkoutSwipeActions} from './app/ui/swipe.js';

$("#workout-date").value = todayInputValue();
setWorkoutFormMode("workout", {hasWeight: true, isTime: false});
setTab(tabFromUrl(), {force: true, updateUrl: false, animate: false});
configureAuth({applyTheme, refreshAll});
setUnauthorizedHandler(showAuthScreen);
bindViewportInsets();
bindHistoryNavigation();
bindEvents();
bindWorkoutValidation();
bindNativeSelectFocusRelease();
bindWorkoutSwipeActions();
bindPullToRefresh();
applyTheme();
registerServiceWorker();
ensureAuth().catch(async error => {
    console.error(error);
    await showAuthScreen(error.message);
});
