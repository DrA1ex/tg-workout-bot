export default {
    // Main menu and bot messages
    bot: {
        welcome: 'Welcome to the workout tracking bot! Use the menu to add workouts or view your progress.',
        launched: 'Bot launched 🚀',
        actionCancelled: 'Action cancelled'
    },

    // Welcome flow for new users
    welcome: {
        greeting: '👋 Welcome to the workout tracking bot!',
        description: '🏋️‍♂️ I will help you:\n\n' +
                    '📊 • Track your workout progress\n' +
                    '💪 • Keep an exercise diary\n' +
                    '📈 • Analyze your results\n' +
                    '🎯 • Achieve your fitness goals\n\n' +
                    '🚀 Let\'s set up the bot for you!',
        setupRequired: '⚙️ To get started, we need to configure a few settings.',
        selectLanguage: '🌍 Select your language:',
        languageSet: '✅ Language set to: {{language}}',
        selectTimezone: '🕐 Now select your timezone:',
        setupComplete: '🎉 Great! Setup is complete.'
    },

    // Main keyboard buttons
    buttons: {
        addWorkout: 'Add Workout',
        addExercise: 'Add Exercise',
        viewWorkout: 'View Workouts',
        deleteWorkout: 'Delete Workouts',
        showProgress: 'Show Progress',
        language: 'Language',
        timezone: 'Timezone',
        myExercises: 'My Exercises',
        today: 'Today',
        pickDate: 'Pick Date',
        cancel: 'Cancel',
        skip: 'Skip',
        previous: '← Previous',
        next: 'Next →',
        deleteAll: '❌ Delete All'
    },

    // Add workout flow
    addWorkout: {
        selectDate: 'Select workout date:',
        pickDate: 'Pick a date:',
        selectedDate: 'Selected date: *{{date}}*',
        noExercises: 'You have no exercises. Please add one first.',
        selectExercise: 'Select exercise:',
        addNewExercise: '➕ Add New Exercise',
        selectedExercise: 'Selected exercise: *{{exercise}}*',
        reuseLastSet: 'Use parameters from last workout?\n{{lastSet}}',
        useLastValues: 'Use previous',
        useNewValues: 'Enter new',
        enterSets: 'Enter number of sets:',
        enterWeight: 'Enter weight (kg):',
        enterReps: 'Enter number of reps:',
        enterTime: 'Enter time in seconds:',
        isTimeQuestion: 'Is this a time-based exercise?',
        workoutSaved: 'Workout saved!',
        workoutAddedLastValues: 'Workout added using *last values*!',
        addAnother: 'Add another workout for the same date?',
        yes: 'Yes, add another',
        no: 'No, finish',
        scenarioCompleted: 'Workout(s) have been added.',
        enterRepsOrTime: 'Enter reps or time (add "s" for seconds):',
        enterNotes: 'Enter notes (or skip):'
    },

    // My exercises flow
    myExercises: {
        title: 'My Exercises',
        noExercises: 'You don\'t have any exercises yet.',
        exerciseList: 'Your exercises list:',
        exerciseItemWithNotes: '• *{{name}}* - {{notes}}',
        exerciseItemWithoutNotes: '• *{{name}}*',
        backToMenu: 'Back to menu'
    },

    // Add exercise flow
    addExercise: {
        selectOption: 'Select option:',
        addNew: 'Add New',
        addExisting: 'Find by name',
        browseAll: 'Browse All',
        enterName: 'Enter new exercise name:',
        enterNote: 'Enter note',
        exerciseExists: 'Exercise "{{name}}" already exists in your list.',
        exerciseAdded: 'Added exercise: {{name}}',
        enterSearch: 'Enter name to search:',
        nothingFound: 'Nothing found.',
        selectFromFound: 'Select exercise:',
        selectFromAll: 'Select exercise from the list:',
        tryAgain: 'Try Again',
    },

    // Delete workout flow
    deleteWorkout: {
        noWorkouts: 'No workouts to delete.',
        selectDate: 'Select date to delete:',
        noWorkoutsOnDate: 'No workouts on {{date}}.',
        deletionSummary: 'Deleting workouts for {{date}}:\n',
        allDeleted: 'All workouts for {{date}} deleted.',
        recordDeleted: 'Record deleted.'
    },

    // View workout flow
    viewWorkout: {
        noWorkouts: 'No workouts.',
        datesWithWorkouts: 'Dates with workouts:',
        workoutsOnDate: 'Workouts on {{date}}:'
    },

    // Progress flow
    progress: {
        noData: 'No data for progress.',
        selectExercise: 'Select exercise:',
        selectedExercise: 'Selected: *{{exercise}}*',
        noDataForExercise: 'No data for selected exercise.',
        setsLabel: 'Sets',
        weightLabel: 'Weight (kg)',
        repsLabel: 'Reps',
        timeLabel: 'Time (sec)',
        exerciseLabel: "Data for *{{exercise}}*:"
    },

    // Workout formatting
    workout: {
        sets: '{{count}} sets',
        weight: 'Weight {{weight}} kg',
        time: '{{time}} sec',
        reps: '{{count}} reps'
    },

    // Calendar
    calendar: {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        cancel: 'Cancel'
    },

    // Locale settings
    locale: {
        date: 'en-US'
    },

    // Validation messages
    validation: {
        invalidNumber: 'Please enter a valid number.',
        invalidDate: 'Please select a valid date.',
        skipped: 'Value *Skipped*'
    },

    // Language selection
    language: {
        select: 'Select language:',
        ru: '🇷🇺 Русский',
        en: '🇺🇸 English',
        de: '🇩🇪 Deutsch',
        fr: '🇫🇷 Français',
        changed: 'Language changed to English'
    },

    // Timezone selection
    timezone: {
        select: 'Select timezone:',
        current: 'Current timezone: *{{timezone}}* ({{offset}})',
        updated: 'Timezone updated to: *{{timezone}}* ({{offset}})',
        custom: 'Enter custom timezone',
        enterOffsetPrompt: 'Enter UTC offset in format +HH:MM or -HH:MM (e.g., +03:00, -05:00):',
        invalidFormat: 'Invalid timezone format. Please use format like Europe/Moscow, +03:00, or UTC.'
    },

    // Runtime messages
    runtime: {
        userNotFound: 'Could not identify user.',
        noActiveFlow: 'No active scenario. Use the menu.',
        responseNotExpected: 'Response was not expected. Use the menu.',
        invalidInput: 'Invalid input. Please try again.',
        selectWithButton: 'Please select an option using the button.',
        selectDateInCalendar: 'Please select a date in the calendar.',
        unexpectedInput: 'Unexpected input.',
        unexpectedChoice: 'Unexpected choice.',
        flowError: 'An error occurred in the flow. Please try again.',
        operationError: 'An error occurred during the operation. Please try again.',
        enterText: 'Enter text:',
        selectOption: 'Select option:',
        selectDate: 'Select date:'
    },

    // Common labels
    common: {
        today: 'Today'
    }
};
