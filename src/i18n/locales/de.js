export default {
    // Main menu and bot messages
    bot: {
        welcome: 'Willkommen beim Workout-Tracking-Bot! Verwenden Sie das Menü, um Workouts hinzuzufügen oder Ihren Fortschritt zu verfolgen.',
        launched: 'Bot gestartet 🚀',
        actionCancelled: 'Aktion abgebrochen'
    },

    // Welcome flow for new users
    welcome: {
        greeting: '👋 Willkommen beim Workout-Tracking-Bot!',
        description: '🏋️‍♂️ Ich werde Ihnen helfen:\n\n' +
                    '📊 • Ihren Workout-Fortschritt zu verfolgen\n' +
                    '💪 • Ein Übungstagebuch zu führen\n' +
                    '📈 • Ihre Ergebnisse zu analysieren\n' +
                    '🎯 • Ihre Fitness-Ziele zu erreichen\n\n' +
                    '🚀 Lassen Sie uns den Bot für Sie einrichten!',
        setupRequired: '⚙️ Um zu beginnen, müssen wir einige Einstellungen konfigurieren.',
        selectLanguage: '🌍 Wählen Sie Ihre Sprache:',
        languageSet: '✅ Sprache eingestellt auf: {{language}}',
        selectTimezone: '🕐 Wählen Sie jetzt Ihre Zeitzone:',
        enterTimezoneOffset: 'Wählen Sie UTC-Offset:',
        selectTimezoneOffset: 'Wählen Sie Ihre Zeitzone:',
        setupComplete: '🎉 Großartig! Die Einrichtung ist abgeschlossen.',
        readyToUse: '🎯 Jetzt können Sie alle Bot-Funktionen nutzen!'
    },

    // Main keyboard buttons
    buttons: {
        addWorkout: 'Workout hinzufügen',
        addExercise: 'Übung hinzufügen',
        viewWorkout: 'Workouts anzeigen',
        deleteWorkout: 'Workouts löschen',
        showProgress: 'Fortschritt anzeigen',
        language: 'Sprache',
        timezone: 'Zeitzone',
        myExercises: 'Meine Übungen',
        today: 'Heute',
        pickDate: 'Datum wählen',
        cancel: 'Abbrechen',
        skip: 'Überspringen',
        previous: '← Zurück',
        next: 'Weiter →',
        deleteAll: '❌ Alle löschen'
    },

    // Language selection
    language: {
        select: 'Wählen Sie Sprache:',
        de: '🇩🇪 Deutsch',
        en: '🇺🇸 English',
        fr: '🇫🇷 Français',
        ru: '🇷🇺 Русский',
        changed: 'Sprache auf Deutsch geändert'
    },

    // Timezone selection
    timezone: {
        select: 'Wählen Sie Zeitzone:',
        current: 'Aktuelle Zeitzone: *{{timezone}}* ({{offset}})',
        updated: 'Zeitzone aktualisiert auf: *{{timezone}}* ({{offset}})',
        selectPrompt: 'Wählen Sie Ihre Zeitzone:',
        custom: 'Benutzerdefinierte Zeitzone eingeben',
        enterCustom: 'Geben Sie Ihre Zeitzone ein (z.B. Europe/Berlin, +01:00, UTC):',
        enterCustomPrompt: 'Zeitzone eingeben:',
        invalidFormat: 'Ungültiges Zeitzonenformat. Verwenden Sie Format wie Europe/Berlin, +01:00 oder UTC.'
    },

    // Runtime messages
    runtime: {
        userNotFound: 'Benutzer konnte nicht identifiziert werden.',
        noActiveFlow: 'Kein aktives Szenario. Verwenden Sie das Menü.',
        responseNotExpected: 'Antwort wurde nicht erwartet. Verwenden Sie das Menü.',
        invalidInput: 'Ungültige Eingabe. Bitte versuchen Sie es erneut.',
        selectWithButton: 'Bitte wählen Sie eine Option mit der Schaltfläche.',
        selectDateInCalendar: 'Bitte wählen Sie ein Datum im Kalender.',
        unexpectedInput: 'Unerwartete Eingabe.',
        unexpectedChoice: 'Unerwartete Auswahl.',
        flowError: 'Ein Fehler ist im Ablauf aufgetreten. Bitte versuchen Sie es erneut.',
        operationError: 'Ein Fehler ist während der Operation aufgetreten. Bitte versuchen Sie es erneut.',
        enterText: 'Text eingeben:',
        selectOption: 'Option wählen:',
        selectDate: 'Datum wählen:'
    },

    // Locale settings
    locale: {
        date: 'de-DE'
    }
};
