import * as dotenv from "dotenv";
import {Telegraf} from "telegraf";
import {startFlow, handleTextMessage, handleCallbackQuery} from "./runtime/index.js";

import {addExercise} from "./flows/add_exercise.js";
import {addWorkout} from "./flows/add_workout.js";
import {deleteWorkout} from "./flows/delete_workout.js";
import {showProgress} from "./flows/progress.js";
import {selectLanguage} from "./flows/language.js";
import * as tg from "telegraf/filters";
import {viewWorkouts} from "./flows/view_workout.js";
import {createMainKeyboard, getUserLanguage, t} from "./i18n/index.js";

dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
    const {_, language} = await getUserLanguage(ctx.from.id);
    const keyboard = createMainKeyboard(language);

    ctx.reply(_('bot.welcome'), keyboard);
});

// Handle localized button presses
bot.on(tg.message("text"), async ctx => {
    const messageText = ctx.message.text;
    const {_, language} = await getUserLanguage(ctx.from.id);

    // Check for button matches in current language
    if (messageText === _('buttons.addWorkout')) {
        await startFlow(ctx, addWorkout, {telegramId: ctx.from.id});
    } else if (messageText === _('buttons.addExercise')) {
        await startFlow(ctx, addExercise, {telegramId: ctx.from.id});
    } else if (messageText === _('buttons.deleteWorkout')) {
        await startFlow(ctx, deleteWorkout, {telegramId: ctx.from.id});
    } else if (messageText === _('buttons.viewWorkout')) {
        await startFlow(ctx, viewWorkouts, {telegramId: ctx.from.id});
    } else if (messageText === _('buttons.showProgress')) {
        await startFlow(ctx, showProgress, {telegramId: ctx.from.id});
    } else if (messageText === _('buttons.language')) {
        await startFlow(ctx, selectLanguage, {telegramId: ctx.from.id});
    } else {
        // Handle flow text messages
        await handleTextMessage(ctx, messageText);
    }
});


bot.on("callback_query", async ctx => {
    await handleCallbackQuery(ctx);
});

bot.launch();
console.log(t('en', 'bot.launched'));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
