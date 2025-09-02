import {Markup} from "telegraf";
import {t} from "../i18n/index.js";

/**
 * generateCalendar(year, month, prefix, language)
 *  - year: full year (e.g. 2025)
 *  - month: zero-based month index (0 = January, 11 = December)
 *  - prefix: string to distinguish different calendars (e.g. 'add' or 'flow')
 *  - language: language code for localization
 *
 * Returns Markup.inlineKeyboard.
 */
export function generateCalendar(year, month, prefix = "flow", language = 'ru') {
    // Create normalized date: Date(year, month) allows month to be any number
    const date = new Date(year, month, 1);
    const renderYear = date.getFullYear();
    const renderMonthIndex = date.getMonth(); // 0..11, normalized
    const daysInMonth = new Date(renderYear, renderMonthIndex + 1, 0).getDate();

    // JS getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
    // We want: Mon,Tue,... -> shift: (getDay() + 6) % 7 => 0 = Mon ... 6 = Sun
    const firstDayIndex = (new Date(renderYear, renderMonthIndex, 1).getDay() + 6) % 7;

    const keyboard = [];

    // Header: navigation and month/year
    keyboard.push([
        Markup.button.callback("<", `calendar_month_${prefix}_${renderYear}_${renderMonthIndex - 1}`),
        Markup.button.callback(
            new Date(renderYear, renderMonthIndex).toLocaleString(t(language, 'locale.date'), {
                month: "long",
                year: "numeric"
            }),
            "noop"
        ),
        Markup.button.callback(">", `calendar_month_${prefix}_${renderYear}_${renderMonthIndex + 1}`)
    ]);

    // Days of the week
    const dayNames = t(language, 'calendar.days');
    keyboard.push(
        dayNames.map(d => Markup.button.callback(d, "noop"))
    );

    // Empty cells before the first day of the month
    let row = [];
    for (let i = 0; i < firstDayIndex; i++) {
        row.push(Markup.button.callback(" ", "noop"));
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const mm = String(renderMonthIndex + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        row.push(
            Markup.button.callback(String(day), `calendar_day_${prefix}_${renderYear}-${mm}-${dd}`)
        );
        if (row.length === 7) {
            keyboard.push(row);
            row = [];
        }
    }

    // Fill the last row with spaces if needed
    if (row.length > 0) {
        while (row.length < 7) row.push(Markup.button.callback(" ", "noop"));
        keyboard.push(row);
    }

    // Cancel button at the bottom
    keyboard.push([Markup.button.callback(t(language, 'calendar.cancel'), `calendar_cancel_${prefix}`)]);

    return Markup.inlineKeyboard(keyboard);
}
