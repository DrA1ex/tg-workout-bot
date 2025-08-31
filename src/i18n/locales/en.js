export default {
    // Main menu and bot messages
    bot: {
        welcome: 'Welcome to the workout tracking bot! Use the menu to add workouts or view your progress.',
        launched: 'Bot launched 🚀',
        actionCancelled: 'Action cancelled'
    },

    // Main keyboard buttons
    buttons: {
        addWorkout: 'Add Workout',
        addExercise: 'Add Exercise',
        viewWorkout: 'View Workouts',
        deleteWorkout: 'Delete Workout',
        showProgress: 'Show Progress',
        language: 'Language',
        cancel: 'Cancel',
        today: 'Today',
        pickDate: 'Pick Date',
        skip: 'Skip',
        previous: '< Previous',
        next: 'Next >',
        deleteAll: '❌ Delete All'
    },

    // Add workout flow
    addWorkout: {
        selectDate: 'Select workout date:',
        pickDate: 'Pick a date:',
        selectedDate: 'Selected date: *{{date}}*',
        noExercises: 'You have no exercises. Please add one first.',
        selectExercise: 'Select exercise:',
        selectedExercise: 'Selected exercise: *{{exercise}}*',
        reuseLastSet: 'Use parameters from last workout?\n{{lastSet}}',
        useLastValues: 'Use previous',
        useNewValues: 'Enter new',
        enterSets: 'Enter number of sets:',
        enterWeight: 'Enter weight (kg):',
        enterReps: 'Enter number of reps:',
        enterTime: 'Enter time in seconds:',
        isTimeQuestion: 'Is this a time-based exercise?',
        workoutSaved: 'Workout saved!'
    },

    // Add exercise flow
    addExercise: {
        selectOption: 'Select option:',
        addNew: 'Add New',
        addExisting: 'Add from Database',
        enterName: 'Enter new exercise name:',
        enterNote: 'Enter note',
        exerciseExists: 'Exercise "{{name}}" already exists in your list.',
        exerciseAdded: 'Added exercise: {{name}}',
        enterSearch: 'Enter name to search:',
        nothingFound: 'Nothing found.',
        selectFromFound: 'Select exercise:'
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
        setsLabel: '{{exercise}} Sets',
        weightLabel: '{{exercise}} Weight (kg)',
        repsLabel: '{{exercise}} Reps',
        timeLabel: '{{exercise}} Time (sec)',
        exerciseLabel: "Data for *{{exercise}}*:"
    },

    // Calendar
    calendar: {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        cancel: 'Cancel'
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
        russian: '🇷🇺 Русский',
        english: '🇺🇸 English',
        changed: 'Language changed to English'
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
        flowError: 'An error occurred in the scenario.',
        operationError: 'Error executing operation.',
        enterText: 'Enter text:',
        selectOption: 'Select option:',
        selectDate: 'Select date:'
    }
};
