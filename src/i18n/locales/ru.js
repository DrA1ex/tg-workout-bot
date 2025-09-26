export default {
    // Main menu and bot messages
    bot: {
        welcome: 'Добро пожаловать в бот для отслеживания тренировок! Используйте меню для добавления тренировок или просмотра прогресса.',
        launched: 'Бот запущен 🚀',
        actionCancelled: 'Действие отменено'
    },

    // Welcome flow for new users
    welcome: {
        greeting: '👋 Добро пожаловать в бот для отслеживания тренировок!',
        description: '🏋️‍♂️ Я помогу вам:\n\n' +
                    '📊 • Отслеживать прогресс тренировок\n' +
                    '💪 • Вести дневник упражнений\n' +
                    '📈 • Анализировать результаты\n' +
                    '🎯 • Достигать ваших фитнес-целей\n\n' +
                    '🚀 Давайте настроим бота под вас!',
        setupRequired: '⚙️ Для начала работы нужно настроить несколько параметров.',
        selectLanguage: '🌍 Выберите язык:',
        languageSet: '✅ Язык установлен: {{language}}',
        selectTimezone: '🕐 Теперь выберите ваш часовой пояс:',
        setupComplete: '🎉 Отлично! Настройка завершена.'
    },

    // Main keyboard buttons
    buttons: {
        addWorkout: 'Добавить тренировку',
        addExercise: 'Добавить упражнение',
        viewWorkout: 'Посмотреть тренировку',
        deleteWorkout: 'Удалить тренировку',
        showProgress: 'Посмотреть прогресс',
        language: 'Язык',
        timezone: 'Часовой пояс',
        myExercises: 'Мои упражнения',
        today: 'Сегодня',
        pickDate: 'Выбрать дату',
        cancel: 'Отмена',
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
        addNewExercise: '➕ Добавить новое упражнение',
        selectedExercise: 'Выбрано упражнение: *{{exercise}}*',
        reuseLastSet: 'Использовать параметры последней тренировки?\n{{lastSet}}',
        useLastValues: 'Использовать прошлые',
        useNewValues: 'Указать новые',
        enterSets: 'Введите количество подходов:',
        enterWeight: 'Введите вес (кг):',
        enterReps: 'Введите количество повторений:',
        enterTime: 'Введите время в секундах:',
        isTimeQuestion: 'Это упражнение на время?',
        workoutSaved: 'Тренировка сохранена!',
        workoutAddedLastValues: 'Тренировка добавлена используя *последние значения*!',
        addAnother: 'Добавить еще одну тренировку на эту же дату?',
        yes: 'Да, добавить еще',
        no: 'Нет, завершить',
        scenarioCompleted: 'Добавление завершено!',
        enterRepsOrTime: 'Введите повторения или время (добавьте "с" для секунд):',
        enterNotes: 'Введите примечания (или пропустите):'
    },

    // My exercises flow
    myExercises: {
        title: 'Мои упражнения',
        noExercises: 'У вас пока нет упражнений.',
        exerciseList: 'Список ваших упражнений:',
        exerciseItemWithNotes: '• *{{name}}* - {{notes}}',
        exerciseItemWithoutNotes: '• *{{name}}*',
        backToMenu: 'Вернуться в меню'
    },

    // Add exercise flow
    addExercise: {
        selectOption: 'Выберите опцию:',
        addNew: 'Добавить новое',
        addExisting: 'Найти по названию',
        browseAll: 'Посмотреть весь список',
        enterName: 'Введите название нового упражнения:',
        enterNote: 'Введите заметку',
        exerciseExists: 'Упражнение "{{name}}" уже есть в вашем списке.',
        exerciseAdded: 'Добавлено упражнение: {{name}}',
        enterSearch: 'Введите название для поиска:',
        nothingFound: 'Ничего не найдено.',
        selectFromFound: 'Выберите упражнение:',
        selectFromAll: 'Выберите упражнение из списка:',
        tryAgain: 'Попробовать снова',
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
        setsLabel: 'Подходов',
        weightLabel: 'Вес (кг)',
        repsLabel: 'Повторения',
        timeLabel: 'Время (сек)',
        exerciseLabel: "Данные для *{{exercise}}*:"
    },

    // Workout formatting
    workout: {
        sets: 'Подходы {{count}}',
        weight: 'Вес {{weight}} кг',
        time: 'Время {{time}} сек',
        reps: 'Повторения {{count}}'
    },

    // Calendar
    calendar: {
        days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        cancel: 'Отмена'
    },

    // Locale settings
    locale: {
        date: 'ru-RU'
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
        ru: '🇷🇺 Русский',
        en: '🇺🇸 English',
        de: '🇩🇪 Deutsch',
        fr: '🇫🇷 Français',
        changed: 'Язык изменен на русский'
    },

    // Timezone selection
    timezone: {
        select: 'Выберите часовой пояс:',
        current: 'Текущий часовой пояс: *{{timezone}}* ({{offset}})',
        updated: 'Часовой пояс обновлен на: *{{timezone}}* ({{offset}})',
        selectPrompt: 'Выберите ваш часовой пояс:',
        custom: 'Ввести свой часовой пояс',
        enterCustom: 'Введите ваш часовой пояс (например, Europe/Moscow, +03:00, UTC):',
        enterCustomPrompt: 'Введите часовой пояс:',
        enterOffset: 'Введите смещение UTC в формате +ЧЧ:ММ или -ЧЧ:ММ:',
        enterOffsetPrompt: 'Введите смещение UTC в формате +ЧЧ:ММ или -ЧЧ:ММ (например, +03:00, -05:00):',
        invalidFormat: 'Неверный формат часового пояса. Используйте формат Europe/Moscow, +03:00 или UTC.'
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
    },

    // Common labels
    common: {
        today: 'Сегодня'
    }
};
