export default {
    // Main menu and bot messages
    bot: {
        welcome: 'Bienvenue dans le bot de suivi d\'entraînement ! Utilisez le menu pour ajouter des entraînements ou voir vos progrès.',
        launched: 'Bot lancé 🚀',
        actionCancelled: 'Action annulée'
    },

    // Welcome flow for new users
    welcome: {
        greeting: '👋 Bienvenue dans le bot de suivi d\'entraînement !',
        description: '🏋️‍♂️ Je vais vous aider à :\n\n' +
                    '📊 • Suivre vos progrès d\'entraînement\n' +
                    '💪 • Tenir un journal d\'exercices\n' +
                    '📈 • Analyser vos résultats\n' +
                    '🎯 • Atteindre vos objectifs fitness\n\n' +
                    '🚀 Configurons le bot pour vous !',
        setupRequired: '⚙️ Pour commencer, nous devons configurer quelques paramètres.',
        selectLanguage: '🌍 Sélectionnez votre langue :',
        languageSet: '✅ Langue définie sur : {{language}}',
        selectTimezone: '🕐 Maintenant, sélectionnez votre fuseau horaire :',
        enterTimezoneOffset: 'Sélectionnez le décalage UTC :',
        selectTimezoneOffset: 'Sélectionnez votre fuseau horaire :',
        setupComplete: '🎉 Parfait ! La configuration est terminée.',
        readyToUse: '🎯 Maintenant vous pouvez utiliser toutes les функциональности du bot !'
    },

    // Main keyboard buttons
    buttons: {
        addWorkout: 'Ajouter un entraînement',
        addExercise: 'Ajouter un exercice',
        viewWorkout: 'Voir les entraînements',
        deleteWorkout: 'Supprimer des entraînements',
        showProgress: 'Voir les progrès',
        language: 'Langue',
        timezone: 'Fuseau horaire',
        myExercises: 'Mes exercices',
        today: 'Aujourd\'hui',
        pickDate: 'Choisir une date',
        cancel: 'Annuler',
        skip: 'Passer',
        previous: '← Précédent',
        next: 'Suivant →',
        deleteAll: '❌ Tout supprimer'
    },

    // Language selection
    language: {
        select: 'Sélectionnez la langue :',
        fr: '🇫🇷 Français',
        en: '🇺🇸 English',
        ru: '🇷🇺 Русский',
        de: '🇩🇪 Deutsch',
        changed: 'Langue changée en français'
    },

    // Timezone selection
    timezone: {
        select: 'Sélectionnez le fuseau horaire :',
        current: 'Fuseau horaire actuel : *{{timezone}}* ({{offset}})',
        updated: 'Fuseau horaire mis à jour vers : *{{timezone}}* ({{offset}})',
        selectPrompt: 'Sélectionnez votre fuseau horaire :',
        custom: 'Entrer un fuseau horaire personnalisé',
        enterCustom: 'Entrez votre fuseau horaire (ex. Europe/Paris, +01:00, UTC) :',
        enterCustomPrompt: 'Entrez le fuseau horaire :',
        invalidFormat: 'Format de fuseau horaire invalide. Utilisez un format comme Europe/Paris, +01:00 ou UTC.'
    },

    // Runtime messages
    runtime: {
        userNotFound: 'Impossible d\'identifier l\'utilisateur.',
        noActiveFlow: 'Aucun scénario actif. Utilisez le menu.',
        responseNotExpected: 'Réponse non attendue. Utilisez le menu.',
        invalidInput: 'Entrée invalide. Veuillez réessayer.',
        selectWithButton: 'Veuillez sélectionner une option avec le bouton.',
        selectDateInCalendar: 'Veuillez sélectionner une date dans le calendrier.',
        unexpectedInput: 'Entrée inattendue.',
        unexpectedChoice: 'Choix inattendu.',
        flowError: 'Une erreur s\'est produite dans le flux. Veuillez réessayer.',
        operationError: 'Une erreur s\'est produite pendant l\'opération. Veuillez réessayer.',
        enterText: 'Entrez le texte :',
        selectOption: 'Sélectionnez l\'option :',
        selectDate: 'Sélectionnez la date :'
    },

    // Locale settings
    locale: {
        date: 'fr-FR'
    }
};
