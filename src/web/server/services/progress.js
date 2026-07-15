import {Op} from "sequelize";

import {ExerciseDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {formatDate} from "../../../i18n/index.js";
import {periodStart} from "./dates.js";
import {volumeFor, workoutPayload} from "./workouts.js";

const MAX_CHART_POINTS = 24;

function pointScore(point) {
    return point.volume || point.weight || point.repsOrTime || point.sets || 0;
}

export function compressProgressPoints(points, maxPoints = MAX_CHART_POINTS) {
    if (points.length <= maxPoints) return points;
    const result = [points[0]];
    const interior = points.slice(1, -1);
    const bucketCount = maxPoints - 2;
    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
        const start = Math.floor(bucket * interior.length / bucketCount);
        const end = Math.max(start + 1, Math.floor((bucket + 1) * interior.length / bucketCount));
        const slice = interior.slice(start, end);
        if (!slice.length) continue;
        result.push(slice.reduce((best, point) => pointScore(point) > pointScore(best) ? point : best));
    }
    result.push(points.at(-1));
    return result;
}

export async function getProgress(user, exercise, period = "all") {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const exercises = await ExerciseDAO.getUserExercises(user.telegramId);
    const selectedExercise = exercise || exercises[0]?.name;

    if (!selectedExercise) {
        return {exercise: null, period, points: [], pointCount: 0, best: null, latest: null, recent: [], summary: null};
    }

    const since = periodStart(period, timezone);
    const where = {
        telegramId: String(user.telegramId),
        exercise: selectedExercise,
        ...(since ? {date: {[Op.gte]: since}} : {}),
    };
    const rows = await models.Workout.findAll({where, order: [["date", "ASC"], ["id", "ASC"]]});
    const allPoints = rows.map(row => ({
        id: row.id,
        date: row.date,
        label: formatDate(new Date(row.date), language, timezone, {month: "short", day: "numeric"}),
        sets: row.sets || 0,
        weight: row.weight == null ? null : row.weight,
        repsOrTime: row.repsOrTime || 0,
        repsTotal: (row.sets || 0) * (row.repsOrTime || 0),
        volume: volumeFor(row),
        isTime: Boolean(row.isTime),
    }));

    const best = allPoints.reduce((max, point) => pointScore(point) > pointScore(max || {}) ? point : max, null);
    const latest = allPoints.at(-1) || null;
    const bestWeight = allPoints.reduce((max, point) => Math.max(max, point.weight || 0), 0);
    const bestVolume = allPoints.reduce((max, point) => Math.max(max, point.volume || 0), 0);
    const bestRepsOrTime = allPoints.reduce((max, point) => Math.max(max, point.repsOrTime || 0), 0);
    const bestRepsTotal = allPoints.reduce((max, point) => Math.max(max, point.repsTotal || 0), 0);
    const bestSets = allPoints.reduce((max, point) => Math.max(max, point.sets || 0), 0);
    const totalVolume = allPoints.reduce((sum, point) => sum + (point.volume || 0), 0);
    const totalRepsOrTime = allPoints.reduce((sum, point) => sum + (point.repsTotal || 0), 0);
    const sessionCount = allPoints.length;
    const totals = allPoints.reduce((result, point) => ({
        weight: result.weight + (point.weight || 0),
        volume: result.volume + (point.volume || 0),
        repsOrTime: result.repsOrTime + (point.repsOrTime || 0),
        repsTotal: result.repsTotal + (point.repsTotal || 0),
        sets: result.sets + (point.sets || 0),
    }), {weight: 0, volume: 0, repsOrTime: 0, repsTotal: 0, sets: 0});
    const bestVolumePoint = allPoints.reduce((bestPoint, point) =>
        (point.volume || 0) > (bestPoint?.volume || 0) ? point : bestPoint, null);
    const bestRepsTotalPoint = allPoints.reduce((bestPoint, point) =>
        (point.repsTotal || 0) > (bestPoint?.repsTotal || 0) ? point : bestPoint, null);

    return {
        exercise: selectedExercise,
        period,
        exercises,
        points: compressProgressPoints(allPoints),
        pointCount: allPoints.length,
        best,
        latest,
        recent: rows.slice(-8).reverse().map(row => workoutPayload(row, language, timezone)),
        summary: {
            sessions: sessionCount,
            bestWeight,
            bestVolume,
            bestRepsOrTime,
            bestRepsTotal,
            bestSets,
            averageWeight: sessionCount ? totals.weight / sessionCount : 0,
            averageVolume: sessionCount ? totals.volume / sessionCount : 0,
            averageRepsOrTime: sessionCount ? totals.repsOrTime / sessionCount : 0,
            averageRepsTotal: sessionCount ? totals.repsTotal / sessionCount : 0,
            averageSets: sessionCount ? totals.sets / sessionCount : 0,
            bestVolumeRecordId: bestVolumePoint?.id || null,
            bestRepsTotalRecordId: bestRepsTotalPoint?.id || null,
            totalVolume,
            totalRepsOrTime,
            hasWeight: allPoints.some(point => point.weight != null),
            isTime: allPoints.some(point => point.isTime),
        },
    };
}
