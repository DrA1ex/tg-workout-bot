export default {
    // Main menu and bot messages
    bot: {
        welcome: 'Добро пожаловать в бот для отслеживания тренировок! Используйте меню для добавления тренировок или просмотра прогресса.',
        launched: 'Бот запущен 🚀',
        actionCancelled: 'Действие отменено'
    },
    
    // Main keyboard buttons
    buttons: {
        addWorkout: 'Добавить тренировку',
        addExercise: 'Добавить упражнение', 
        viewWorkout: 'Посмотреть тренировку',
        deleteWorkout: 'Удалить тренировку',
        showProgress: 'Посмотреть прогресс',
        language: 'Язык',
        cancel: 'Отменить',
        today: 'Сегодня',
        pickDate: 'Выбрать дату',
        skip: 'Пропустить',
        previous: '< Предыдущая',
        next: 'Следующая >',
        deleteAll: '❌ Удалить все'
    },

    // Add workout flow
    addWorkout: {
        selectDate: 'Выберите дату тренировки:',
        pickDate: 'Выберите дату:',
        selectedDate: 'Выбрана дата: *{{date}}*',
        noExercises: 'У вас нет упражнений. Добавьте новое сначала.',
        selectExercise: 'Выберите упражнение:',
        selectedExercise: 'Выбрано упражнение: *{{exercise}}*',
        reuseLastSet: 'Использовать параметры последней тренировки?\n{{lastSet}}',
        enterSets: 'Введите количество подходов:',
        enterWeight: 'Введите вес (кг):',
        enterReps: 'Введите количество повторений:',
        enterTime: 'Введите время в секундах:',
        isTimeQuestion: 'Это упражнение на время?',
        workoutSaved: 'Тренировка сохранена!'
    },

    // Add exercise flow
    addExercise: {
        selectOption: 'Выберите опцию:',
        addNew: 'Добавить новое',
        addExisting: 'Добавить из базы',
        enterName: 'Введите название нового упражнения:',
        enterNote: 'Введите заметку',
        exerciseExists: 'Упражнение "{{name}}" уже есть в вашем списке.',
        exerciseAdded: 'Добавлено упражнение: {{name}}',
        enterSearch: 'Введите название для поиска:',
        nothingFound: 'Ничего не найдено.',
        selectFromFound: 'Выберите упражнение:'
    },

    // Delete workout flow
    deleteWorkout: {
        noWorkouts: 'Нет тренировок для удаления.',
        selectDate: 'Выберите дату для удаления:',
        noWorkoutsOnDate: 'Нет тренировок на {{date}}.',
        deletionSummary: 'Удаление тренировок за {{date}}:\n',
        allDeleted: 'Все тренировки за {{date}} удалены.',
        recordDeleted: 'Запись удалена.'
    },

    // View workout flow
    viewWorkout: {
        noWorkouts: 'Нет тренировок.',
        datesWithWorkouts: 'Даты с тренировками:',
        workoutsOnDate: 'Тренировки на {{date}}:'
    },

    // Progress flow
    progress: {
        noData: 'Нет данных для прогресса.',
        selectExercise: 'Выберите упражнение:',
        selectedExercise: 'Выбрано: *{{exercise}}*',
        noDataForExercise: 'Нет данных для выбранного упражнения.',
        setsLabel: '{{exercise}} Подходов',
        weightLabel: '{{exercise}} Вес (кг)',
        repsLabel: '{{exercise}} Повторения',
        timeLabel: '{{exercise}} Время (сек)',
        exerciseLabel: "Данные для *{{exercise}}*:"
    },

    // Calendar
    calendar: {
        days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        cancel: 'Отмена'
    },

    // Validation messages
    validation: {
        invalidNumber: 'Пожалуйста, введите корректное число.',
        invalidDate: 'Пожалуйста, выберите корректную дату.',
        skipped: 'Значение *Пропущено*'
    },

    // Language selection
    language: {
        select: 'Выберите язык:',
        russian: '🇷🇺 Русский',
        english: '🇺🇸 English',
        changed: 'Язык изменен на русский'
    },

    // Runtime messages
    runtime: {
        userNotFound: 'Не удалось определить пользователя.',
        noActiveFlow: 'Нет активного сценария. Используйте меню.',
        responseNotExpected: 'Ответ не ожидался. Используйте меню.',
        invalidInput: 'Некорректный ввод. Попробуйте снова.',
        selectWithButton: 'Выберите вариант кнопкой.',
        selectDateInCalendar: 'Пожалуйста, выберите дату в календаре.',
        unexpectedInput: 'Неожиданный ввод.',
        unexpectedChoice: 'Неожиданный выбор.',
        flowError: 'Произошла ошибка в сценарии.',
        operationError: 'Ошибка при выполнении операции.',
        enterText: 'Введите текст:',
        selectOption: 'Выберите вариант:',
        selectDate: 'Выберите дату:'
    }
};
