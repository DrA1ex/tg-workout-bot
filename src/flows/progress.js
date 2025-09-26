import {cancelled, responseMarkdown} from "../runtime/primitives.js";
import QuickChart from "quickchart-js";
import {formatDate, getUserLanguage} from "../i18n/index.js";
import {getAndSelectExercise} from "../utils/exercise_selector.js";
import {WorkoutDAO} from "../dao/index.js";
import {checkEmptyListAndRespond, getUserAndTimezone} from "./common.js";

function _dt(row, language = 'ru', timezone = 'UTC') {
    return formatDate(new Date(row.get("date")), language, timezone);
}

const Colors = ["#2563eb", "#ef4444", "#10b981", "#f97316", "#7c3aed", "#06b6d4", "#84cc16", "#8b5cf6"];

export function* showProgress(state) {
    const {_, language} = yield getUserLanguage(state.telegramId);

    const {timezone} = yield* getUserAndTimezone(state);

    // Use utility to get and select exercise
    const selectedEx = yield* getAndSelectExercise(state, _('progress.selectExercise'), _);
    if (!selectedEx) return yield cancelled(state);

    yield responseMarkdown(state, _('progress.selectedExercise', {exercise: selectedEx}));

    // Get only needed records from database
    const rows = yield WorkoutDAO.getWorkoutsByExercise(state.telegramId, selectedEx);

    if (yield* checkEmptyListAndRespond(state, rows, 'progress.noDataForExercise', _)) {
        return;
    }

    const dates = [...new Set(rows.map(row => _dt(row, language, timezone)))];
    const getData = (key) => dates.map(d => rows.find(w => _dt(w, language, timezone) === d)?.[key] ?? null);

    const isTime = rows[0].isTime;

    const datasets = [
        {
            label: _('progress.setsLabel'),
            data: getData("sets"),
            borderColor: Colors[0],
            fill: false
        },
        {
            label: rows[0].isTime ? _('progress.timeLabel') : _('progress.repsLabel'),
            data: getData("repsOrTime"),
            borderColor: Colors[2],
            fill: false,
        },
        ...(isTime ? [] : [{
            label: _('progress.weightLabel'),
            data: getData("weight"),
            borderColor: Colors[1],
            fill: false
        }]),
    ];

    const chart = new QuickChart();
    chart.setConfig({
        type: "line",
        data: {labels: dates, datasets},
        options: {
            title: {display: true, text: selectedEx},
            scales: {
                xAxes: [{type: "category"}],
                yAxes: [{beginAtZero: true}]
            }
        }
    });

    yield async (_state, ctx) => {
        const caption = _('progress.exerciseLabel', {exercise: selectedEx});

        let summary = `${caption}:\n`;
        rows.forEach((r, i) => {
            summary += `${i + 1}. ${r.formatString(language, timezone)}\n`;
        });

        await ctx.replyWithMarkdown(summary);
        await ctx.replyWithPhoto({url: chart.getUrl()}, {caption, parse_mode: 'Markdown'});
    };
}
