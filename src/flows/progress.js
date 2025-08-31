import {models} from "../db/index.js";
import {requestChoice, response, cancelled, responseMarkdown} from "../runtime/primitives.js";
import QuickChart from "quickchart-js";
import {getUserLanguage, formatDate} from "../i18n/index.js";

function _dt(row, language = 'ru') {
    return formatDate(new Date(row.get("date")), language);
}

const Colors = ["#2563eb", "#ef4444", "#10b981", "#f97316", "#7c3aed", "#06b6d4", "#84cc16", "#8b5cf6"];

export function* showProgress(state) {
    const {_, language} = yield getUserLanguage(state.telegramId);

    // Get list of unique user exercises
    const exercises = yield models.Workout.findAll({
        where: {telegramId: String(state.telegramId)},
        attributes: ["exercise"],
        group: ["exercise"]
    });

    if (!exercises.length) {
        yield response(state, _('progress.noData'));
        return;
    }

    const exOptions = exercises.reduce((acc, ex, idx) => {
        acc[idx] = ex.exercise;
        return acc;
    }, {cancel: _('buttons.cancel')});

    const exKey = yield requestChoice(state, exOptions, _('progress.selectExercise'));
    if (exKey === "cancel") return yield cancelled(state);

    const selectedEx = exercises[exKey].exercise;
    yield responseMarkdown(state, _('progress.selectedExercise', {exercise: selectedEx}));

    // Get only needed records from database
    const rows = yield models.Workout.findAll({
        where: {telegramId: String(state.telegramId), exercise: selectedEx},
        order: [["date", "ASC"]]
    });

    if (!rows.length) {
        yield response(state, _('progress.noDataForExercise'));
        return;
    }

    const dates = [...new Set(rows.map(row => _dt(row, language)))];
    const getData = (key) => dates.map(d => rows.find(w => _dt(w, language) === d)?.[key] ?? null);

    const datasets = [
        {
            label: _('progress.setsLabel', {exercise: selectedEx}),
            data: getData("sets"),
            borderColor: Colors[0],
            fill: false
        },
        {
            label: _('progress.weightLabel', {exercise: selectedEx}),
            data: getData("weight"),
            borderColor: Colors[1],
            fill: false
        },
        {
            label: rows[0].isTime ? _('progress.timeLabel', {exercise: selectedEx}) : _('progress.repsLabel', {exercise: selectedEx}),
            data: getData("repsOrTime"),
            borderColor: Colors[2],
            fill: false,
        },
    ];

    const chart = new QuickChart();
    chart.setConfig({
        type: "line",
        data: {labels: dates, datasets},
        options: {
            title: {display: true, text: `${selectedEx} Progress`},
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
            summary += `${i + 1}. ${r.formatString(language)}\n`;
        });

        await ctx.replyWithMarkdown(summary);
        await ctx.replyWithPhoto({url: chart.getUrl()}, {caption, parse_mode: 'Markdown'});
    };
}
