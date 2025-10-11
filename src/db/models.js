import {DataTypes} from 'sequelize';
import {formatDate, t} from '../i18n/index.js';

export default function initModels(sequelize) {
    const User = sequelize.define('User', {
        telegramId: {type: DataTypes.STRING, primaryKey: true},
        exercises: {type: DataTypes.TEXT, allowNull: false, defaultValue: '[]'}, // JSON array
        language: {type: DataTypes.STRING, allowNull: false, defaultValue: 'ru'}, // Language preference
        timezone: {type: DataTypes.STRING, allowNull: false, defaultValue: 'UTC'} // Timezone preference
    }, {tableName: 'users', timestamps: false});

    const Workout = sequelize.define('Workout', {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        telegramId: {type: DataTypes.STRING, allowNull: false},
        date: {type: DataTypes.DATE, allowNull: false},
        exercise: {type: DataTypes.STRING, allowNull: false},
        sets: {type: DataTypes.INTEGER},
        weight: {type: DataTypes.FLOAT},
        repsOrTime: {type: DataTypes.FLOAT},
        isTime: {type: DataTypes.BOOLEAN, defaultValue: false},
        notes: {type: DataTypes.TEXT}
    }, {tableName: 'workouts', timestamps: false});

    Workout.prototype.formatString = function (language = 'en', timezone = 'UTC') {
        // Import formatDate here to avoid circular dependency

        const date = formatDate(new Date(this.date), language, timezone);
        const exercise = this.exercise;
        const sets = t(language, 'workout.sets', {count: this.sets});
        const weight = this.weight ? t(language, 'workout.weight', {weight: this.weight}) + ', ' : '';
        const repsOrTime = this.isTime ?
                           t(language, 'workout.time', {time: this.repsOrTime}) :
                           t(language, 'workout.reps', {count: this.repsOrTime});
        const notes = this.notes ? `:\n    - ${this.notes}` : '';

        return `${date}: ${exercise}, ${sets}, ${weight}${repsOrTime}${notes}`;
    };

    const GlobalExercise = sequelize.define('GlobalExercise', {
        name: {type: DataTypes.STRING, primaryKey: true}
    }, {tableName: 'global_exercises', timestamps: false});

    const SystemSettings = sequelize.define('SystemSettings', {
        key: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
        value: {type: DataTypes.JSONB, allowNull: false},
    }, {tableName: 'system_settings', timestamps: false});

    // associations
    User.hasMany(Workout, {foreignKey: 'telegramId', sourceKey: 'telegramId'});
    Workout.belongsTo(User, {foreignKey: 'telegramId', targetKey: 'telegramId'});

    return {User, Workout, GlobalExercise, SystemSettings};
}
