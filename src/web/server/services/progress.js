import {Op} from "sequelize";

import {ExerciseDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {formatDate} from "../../../i18n/index.js";
import {periodStart} from "./dates.js";
import {normalizeExercise} from "./exercises.js";
import {volumeFor, workoutPayload} from "./workouts.js";

export async function getProgress(user, exercise, period = "all") {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const exercises = (await ExerciseDAO.getUserExercises(user.telegramId)).map(normalizeExercise);
    const selectedExercise = exercise || exercises[0]?.name;

    if (!selectedExercise) {
        return {exercise: null, period, points: [], best: null, latest: null, recent: [], summary: null};
    }

    const since = periodStart(period);
    const where = {
        telegramId: String(user.telegramId),
        exercise: selectedExercise,
        ...(since ? {date: {[Op.gte]: since}} : {}),
    };
    const rows = await models.Workout.findAll({
        where,
        order: [["date", "ASC"]],
    });

    const points = rows.map(row => ({
        id: row.id,
        date: row.date,
        label: formatDate(new Date(row.date), language, timezone, {month: "short", day: "numeric"}),
        sets: row.sets || 0,
        weight: row.weight == null ? null : row.weight,
        repsOrTime: row.repsOrTime || 0,
        repsTotal: (row.sets || 0) * (row.repsOrTime || 0),
        volume: volumeFor(row),
        isTime: row.isTime,
    }));

    const best = points.reduce((max, point) => {
        const current = point.volume || point.weight || point.repsOrTime || point.sets || 0;
        const previous = max ? (max.volume || max.weight || max.repsOrTime || max.sets || 0) : -Infinity;
        return current > previous ? point : max;
    }, null);
    const latest = points.at(-1) || null;
    const bestWeight = points.reduce((max, point) => Math.max(max, point.weight || 0), 0);
    const bestVolume = points.reduce((max, point) => Math.max(max, point.volume || 0), 0);
    const bestRepsOrTime = points.reduce((max, point) => Math.max(max, point.repsOrTime || 0), 0);
    const totalVolume = points.reduce((sum, point) => sum + (point.volume || 0), 0);
    const totalRepsOrTime = points.reduce((sum, point) => sum + (point.repsTotal || 0), 0);

    return {
        exercise: selectedExercise,
        period,
        exercises,
        points,
        best,
        latest,
        recent: rows.slice(-8).reverse().map(row => workoutPayload(row, language, timezone)),
        summary: {
            sessions: points.length,
            bestWeight,
            bestVolume,
            bestRepsOrTime,
            totalVolume,
            totalRepsOrTime,
            hasWeight: points.some(point => point.weight != null),
            isTime: points.some(point => point.isTime),
        },
    };
}
