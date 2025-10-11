import * as dotenv from "dotenv";
import {Telegraf} from "telegraf";
import * as tg from "telegraf/filters";

import {handleCallbackQuery, handleTextMessage, startFlow} from "./runtime/index.js";

import {ensureDb} from "./db/index.js";
import {SystemDAO, UserDAO} from "./dao/index.js";
import {createMainKeyboard, getUserLanguage, t} from "./i18n/index.js";
import * as BackupUtils from "./utils/backup.js";

import {addExercise} from "./flows/add_exercise.js";
import {addWorkout} from "./flows/add_workout.js";
import {deleteWorkout} from "./flows/delete_workout.js";
import {showProgress} from "./flows/progress.js";
import {selectLanguage} from "./flows/language.js";
import {timezoneSettings} from "./flows/timezone.js";
import {welcomeFlow} from "./flows/welcome.js";
import {viewWorkouts} from "./flows/view_workout.js";
import {myExercises} from "./flows/my_exercises.js";

dotenv.config();

await ensureDb();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
    const userId = ctx.from.id;

    // Check if user exists and has language/timezone set
    const user = await UserDAO.findByTelegramId(userId);

    if (!user || !user.language || !user.timezone) {
        // New user or incomplete setup - start welcome flow
        await startFlow(ctx, welcomeFlow, {telegramId: userId});
    } else {
        // Existing user - show main menu
        const {_, language} = await getUserLanguage(userId);
        const keyboard = createMainKeyboard(language);
        ctx.reply(_('bot.welcome'), keyboard);
    }
});

// Handle localized button presses
bot.on(tg.message("text"), async ctx => {
    const messageText = ctx.message.text;
    const {_} = await getUserLanguage(ctx.from.id);

    // Check for button matches in current language
    const menus = {
        [_('buttons.addWorkout')]: addWorkout,
        [_('buttons.addExercise')]: addExercise,
        [_('buttons.deleteWorkout')]: deleteWorkout,
        [_('buttons.viewWorkout')]: viewWorkouts,
        [_('buttons.showProgress')]: showProgress,
        [_('buttons.language')]: selectLanguage,
        [_('buttons.timezone')]: timezoneSettings,
        [_('buttons.myExercises')]: myExercises,
    };

    const fn = menus[messageText];
    if (fn) {
        await startFlow(ctx, fn, {telegramId: ctx.from.id});
    } else {
        // Handle flow text messages
        await handleTextMessage(ctx, messageText);
    }
});


bot.on("callback_query", async ctx => {
    await handleCallbackQuery(ctx);
});

bot.launch().catch(e => {
    console.error(e);
    process.exit(1);
});

console.log(t('en', 'bot.launched'));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

const backupCheckInterval = await SystemDAO.getParameter("backup_check_interval", 15 * 60 * 1000);
setInterval(() => BackupUtils.doBackup(bot), backupCheckInterval);
