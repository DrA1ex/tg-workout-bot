// Extracted from main.js without changing feature behavior.
import {currentLocale, parseClientDate} from '../../core/utils.js';
import {$, $$, api, escapeHtml, state, t} from '../../deps.js';
import {workoutDetail} from '../workouts/presentation.js';

export function renderProgress() {
    const data = state.progress;
    const isInitialLoading = !state.progressLoaded;
    $("#progress-skeleton").hidden = !isInitialLoading;
    $("#progress-content").hidden = isInitialLoading;
    if (isInitialLoading) return;

    updateProgressMetricControls(data);

    if (!data?.points?.length) {
        renderProgressChartEmpty(t("empty.progress"));
        $("#progress-best").textContent = "0";
        $("#progress-latest").textContent = "0";
        $("#progress-pr").textContent = "0";
        $("#progress-recent").innerHTML = `<div class="empty">${t("empty.progress")}</div>`;
        return;
    }

    const metric = state.progressMetric;
    const values = data.points.map(point => metricValue(point, metric));
    const bestValue = Math.max(...values, 0);
    const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;

    $("#progress-best").textContent = formatMetricWithUnit(bestValue, metric);
    $("#progress-latest").textContent = formatMetricWithUnit(averageValue, metric);
    $("#progress-best-label").textContent = metricLabel(metric);
    $("#progress-latest-label").textContent = metricLabel(metric);
    const totalMetric = progressRecordMetric(data);
    const totalValue = totalMetric === "volume" ? data.summary?.totalVolume || 0 : data.summary?.totalRepsOrTime || 0;
    $("#progress-pr-metric-label").textContent = progressSummaryMetricLabel(totalMetric);
    $("#progress-pr").textContent = formatMetricWithUnit(totalValue, totalMetric);
    $("#progress-pr-label").textContent = t("progress.total");
    renderProgressRecent(data.recent || []);
    if (data.points.length < 2) {
        renderProgressChartEmpty(t("progress.notEnoughData"));
    } else {
        ensureProgressChart();
        drawChart(data.points, metric);
    }
}

export function updateProgressMetricControls(data) {
    const availableMetrics = progressAvailableMetrics(data);
    if (!availableMetrics.includes(state.progressMetric)) {
        state.progressMetric = availableMetrics[0] || "repsOrTime";
    }

    $$("#progress-metric button").forEach(button => {
        const metric = button.dataset.metric;
        const visible = availableMetrics.includes(metric);
        button.hidden = !visible;
        button.classList.toggle("active", metric === state.progressMetric);
        if (metric === "repsOrTime") {
            button.textContent = progressResultMetricLabel(data);
        }
    });
}

export function progressAvailableMetrics(data) {
    const points = data?.points || [];
    const hasWeight = Boolean(data?.summary?.hasWeight) || points.some(point => point.weight != null && Number(point.weight) > 0);
    return [
        hasWeight ? "weight" : null,
        "repsOrTime",
        "sets",
    ].filter(Boolean);
}

export function progressResultMetricLabel(data) {
    return data?.summary?.isTime ? t("progress.seconds") : t("progress.repsTime");
}

export function ensureProgressChart() {
    const wrap = $("#progress-content .progress-chart-wrap");
    if ($("#progress-chart")) return;
    wrap.classList.remove("empty");
    wrap.innerHTML = `<svg id="progress-chart" viewBox="0 0 360 246" role="img" aria-label="Progress chart"></svg>`;
}

export function renderProgressChartEmpty(message) {
    const wrap = $("#progress-content .progress-chart-wrap");
    wrap.classList.add("empty");
    wrap.innerHTML = `<div class="progress-chart-empty">${escapeHtml(message)}</div>`;
}

export function metricValue(point, metric) {
    if (metric === "volume") return point.volume || (!point.isTime && point.weight && point.repsOrTime && point.sets
        ? point.weight * point.repsOrTime * point.sets
        : 0);
    if (metric === "repsTotal") return point.repsTotal || (!point.isTime && point.repsOrTime && point.sets
        ? point.repsOrTime * point.sets
        : 0);
    if (metric === "repsOrTime") return point.repsOrTime || 0;
    if (metric === "sets") return point.sets || 0;
    return point.weight || 0;
}

export function formatMetric(value, metric) {
    const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
    if (metric === "weight") return rounded ? `${rounded}` : "0";
    if (metric === "volume") return Math.round(value).toLocaleString();
    return String(rounded);
}

export function formatMetricWithUnit(value, metric) {
    const formatted = formatMetric(value, metric);
    if (metric === "weight" || metric === "volume") return `${formatted} kg`;
    if (metric === "repsOrTime" && state.progress?.summary?.isTime) return `${formatted} ${t("units.sec")}`;
    if (metric === "repsTotal") return state.progress?.summary?.isTime ? `${formatted} ${t("units.sec")}` : formatted;
    return formatted;
}

export function metricLabel(metric) {
    if (metric === "volume") return t("progress.volumeMetric");
    if (metric === "repsTotal") return progressResultMetricLabel(state.progress);
    if (metric === "repsOrTime") return progressResultMetricLabel(state.progress);
    if (metric === "sets") return t("fields.sets");
    return t("progress.weight");
}

export function progressRecordMetric(data) {
    const points = data?.points || [];
    const hasWeight = Boolean(data?.summary?.hasWeight) || points.some(point => point.weight != null && Number(point.weight) > 0);
    return hasWeight ? "volume" : "repsTotal";
}

export function progressSummaryMetricLabel(metric) {
    if (metric === "volume") return t("progress.volumeMetric");
    return state.progress?.summary?.isTime ? t("progress.timeTotal") : t("progress.repsTotal");
}

export function renderProgressRecent(rows) {
    const data = state.progress;
    const metric = progressRecordMetric(data);
    const metricValues = (data?.points || []).map(point => metricValue(point, metric));
    const uniqueMetricValues = new Set(metricValues);
    const bestMetricValue = Math.max(...metricValues, 0);
    const prPoint = uniqueMetricValues.size > 1
        ? (data?.points || []).find(point => metricValue(point, metric) === bestMetricValue)
        : null;
    $("#progress-recent").innerHTML = rows.length
        ? rows.map(row => `
            <button class="progress-record-row" type="button" data-edit-workout="${row.id}">
                <span class="progress-record-clock">◷</span>
                <span class="progress-record-body">
                    <strong>${escapeHtml(row.dateLabel)}</strong>
                    <small>${escapeHtml(workoutDetail(row))}</small>
                </span>
                ${prPoint?.id === row.id ? `<span class="progress-pr-badge">${t("progress.pr")}</span>` : ""}
                <span class="progress-record-chevron">›</span>
            </button>
        `).join("")
        : `<div class="empty">${t("empty.progress")}</div>`;
}

export function drawChart(points, metric) {
    const svg = $("#progress-chart");
    const values = points.map(point => metricValue(point, metric));
    const rawMax = Math.max(...values, 1);
    const rawMin = Math.min(...values, 0);
    const width = 360;
    const height = 246;
    const padLeft = 40;
    const padRight = 18;
    const padTop = 34;
    const padBottom = 36;
    const min = rawMin === rawMax ? Math.max(0, rawMin - 1) : Math.max(0, rawMin - (rawMax - rawMin) * .12);
    const max = rawMin === rawMax ? rawMax + 1 : rawMax + (rawMax - rawMin) * .12;
    const span = Math.max(max - min, 1);
    const step = points.length > 1 ? (width - padLeft - padRight) / (points.length - 1) : 0;
    const coords = values.map((value, index) => {
        const x = padLeft + index * step;
        const y = height - padBottom - ((value - min) / span) * (height - padTop - padBottom);
        return [x, y];
    });
    const path = coords.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const ticks = [0, .25, .5, .75, 1].map(ratio => ({
        value: min + span * ratio,
        y: height - padBottom - ratio * (height - padTop - padBottom),
    })).reverse();
    const labelIndexes = points.length <= 4
        ? points.map((_, index) => index)
        : [0, Math.floor((points.length - 1) / 2), points.length - 1];
    const labelAnchor = index => {
        if (index === 0) return "start";
        if (index === points.length - 1) return "end";
        return "middle";
    };
    const last = coords.at(-1);
    const lastValue = values.at(-1) || 0;
    const bubbleX = Math.min(Math.max(last?.[0] || width / 2, 58), width - 58);
    const bubbleY = Math.max((last?.[1] || padTop) - 32, 20);
    const arrowX = last ? Math.min(Math.max(last[0], bubbleX - 34), bubbleX + 34) : bubbleX;

    svg.innerHTML = `
        <text x="${padLeft - 34}" y="${padTop - 12}" fill="var(--muted)" font-size="12" font-weight="700">${escapeHtml(metricUnit(metric))}</text>
        ${ticks.map(tick => `
            <line x1="${padLeft}" y1="${tick.y.toFixed(1)}" x2="${width - padRight}" y2="${tick.y.toFixed(1)}" stroke="var(--line)" stroke-width="1"></line>
            <text x="${padLeft - 8}" y="${(tick.y + 4).toFixed(1)}" text-anchor="end" fill="var(--muted)" font-size="12">${escapeHtml(formatAxisValue(tick.value, metric))}</text>
        `).join("")}
        <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
        ${coords.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="var(--primary)" stroke="var(--surface)" stroke-width="2"></circle>`).join("")}
        ${labelIndexes.map(index => `<text x="${coords[index][0].toFixed(1)}" y="${height - 8}" text-anchor="${labelAnchor(index)}" fill="var(--muted)" font-size="12" font-weight="650">${escapeHtml(chartDateLabel(points[index]))}</text>`).join("")}
        ${last ? `
            <g>
                <rect x="${(bubbleX - 44).toFixed(1)}" y="${(bubbleY - 20).toFixed(1)}" width="88" height="30" rx="8" fill="var(--primary)"></rect>
                <path d="M${(arrowX - 6).toFixed(1)} ${(bubbleY + 10).toFixed(1)} L${arrowX.toFixed(1)} ${(bubbleY + 18).toFixed(1)} L${(arrowX + 6).toFixed(1)} ${(bubbleY + 10).toFixed(1)} Z" fill="var(--primary)"></path>
                <text x="${bubbleX.toFixed(1)}" y="${(bubbleY + 1).toFixed(1)}" text-anchor="middle" fill="var(--primary-ink)" font-size="13" font-weight="850">${escapeHtml(formatMetricWithUnit(lastValue, metric))}</text>
            </g>
        ` : ""}
        ${coords.length === 1 ? `<text x="${width / 2}" y="${height - 58}" text-anchor="middle" fill="var(--muted)" font-size="12">${t("progress.notEnoughData")}</text>` : ""}
    `;
}

export function metricUnit(metric) {
    if (metric === "weight" || metric === "volume") return "kg";
    if (metric === "repsTotal") return state.progress?.summary?.isTime ? t("units.sec") : t("units.reps");
    if (metric === "sets") return t("fields.sets").toLowerCase();
    return state.progress?.summary?.isTime ? t("units.sec") : t("progress.repsTime").toLowerCase();
}

export function formatAxisValue(value, metric) {
    if (metric === "volume" || metric === "repsTotal") return Math.round(value).toLocaleString();
    const rounded = Number(value.toFixed(value >= 10 ? 0 : 1));
    return String(rounded);
}

export function chartDateLabel(point) {
    const date = parseClientDate(point?.date);
    if (!date) return point?.label || "";
    return date.toLocaleDateString(currentLocale(), {month: "short", day: "numeric"});
}

export function ensureProgressLoaded() {
    if (state.progressLoaded || state.progressLoading) return;
    if (!state.user) {
        renderProgress();
        return;
    }
    loadProgress().catch(console.error);
}

export async function loadProgress() {
    state.progressLoading = true;
    renderProgress();
    const exercise = $("#progress-exercise").value || state.exercises[0]?.name || "";
    $("#progress-period").value = state.progressPeriod;
    const params = new URLSearchParams();
    if (exercise) params.set("exercise", exercise);
    params.set("period", state.progressPeriod);
    try {
        state.progress = await api(`progress?${params.toString()}`);
        state.progressLoaded = true;
        if (state.progress.exercise) $("#progress-exercise").value = state.progress.exercise;
    } finally {
        state.progressLoading = false;
        renderProgress();
    }
}
