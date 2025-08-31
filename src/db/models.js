import {DataTypes} from 'sequelize';
import {formatDate} from '../i18n/index.js';

export default function initModels(sequelize) {
    const User = sequelize.define('User', {
        telegramId: {type: DataTypes.STRING, primaryKey: true},
        exercises: {type: DataTypes.TEXT, allowNull: false, defaultValue: '[]'}, // JSON array
        language: {type: DataTypes.STRING, allowNull: false, defaultValue: 'ru'} // Language preference
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

    Workout.prototype.formatString = function (language = 'en') {
        // Import formatDate here to avoid circular dependency

        const date = formatDate(new Date(this.date), language);
        const exercise = this.exercise;
        const sets = language === 'en' ? `${this.sets} sets` : `Подходы ${this.sets}`;
        const weight = this.weight ?
                       (language === 'en' ? `Weight ${this.weight} kg, ` : `Вес ${this.weight} кг, `) : '';
        const repsOrTime = this.isTime ?
                           (language === 'en' ? `${this.repsOrTime} sec` : `Время ${this.repsOrTime} сек`) :
                           (language === 'en' ? `${this.repsOrTime} reps` : `Повторения ${this.repsOrTime}`);

        return `${date}: ${exercise}, ${sets}, ${weight}${repsOrTime}`;
    };

    const GlobalExercise = sequelize.define('GlobalExercise', {
        name: {type: DataTypes.STRING, primaryKey: true}
    }, {tableName: 'global_exercises', timestamps: false});

    // associations
    User.hasMany(Workout, {foreignKey: 'telegramId', sourceKey: 'telegramId'});
    Workout.belongsTo(User, {foreignKey: 'telegramId', targetKey: 'telegramId'});

    return {User, Workout, GlobalExercise};
}
