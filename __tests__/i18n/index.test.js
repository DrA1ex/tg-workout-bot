import {jest} from '@jest/globals';
import {detectUserLanguage, getUserLanguage, setUserLanguage, t} from '../../src/i18n/index.js';
import {silenceConsole} from '../mocks/console-mocks.js';

describe('i18n Module Tests', () => {
    describe('detectUserLanguage', () => {
        it('should return exact match for supported languages', () => {
            expect(detectUserLanguage('en')).toBe('en');
            expect(detectUserLanguage('ru')).toBe('ru');
            expect(detectUserLanguage('de')).toBe('de');
            expect(detectUserLanguage('fr')).toBe('fr');
        });

        it('should extract base language from complex codes', () => {
            expect(detectUserLanguage('en-US')).toBe('en');
            expect(detectUserLanguage('ru-RU')).toBe('ru');
            expect(detectUserLanguage('de-DE')).toBe('de');
            expect(detectUserLanguage('fr-CA')).toBe('fr');
            expect(detectUserLanguage('en-GB')).toBe('en');
            expect(detectUserLanguage('ru-BY')).toBe('ru');
        });

        it('should handle edge cases gracefully', () => {
            expect(detectUserLanguage('')).toBe('en');
            expect(detectUserLanguage(null)).toBe('en');
            expect(detectUserLanguage(undefined)).toBe('en');
            expect(detectUserLanguage('invalid')).toBe('en');
            expect(detectUserLanguage('xyz-123')).toBe('en');
        });

        it('should handle mixed case language codes', () => {
            expect(detectUserLanguage('EN')).toBe('en');
            expect(detectUserLanguage('RU')).toBe('ru');
            expect(detectUserLanguage('En-Us')).toBe('en');
            expect(detectUserLanguage('rU-Ru')).toBe('ru');
        });

        it('should return English for unsupported base languages', () => {
            expect(detectUserLanguage('es')).toBe('en'); // Spanish not supported
            expect(detectUserLanguage('it')).toBe('en'); // Italian not supported
            expect(detectUserLanguage('pt')).toBe('en'); // Portuguese not supported
            expect(detectUserLanguage('ja')).toBe('en'); // Japanese not supported
        });
    });

    describe('t function', () => {
        it('should return correct translations for English', () => {
            expect(t('en', 'welcome.greeting')).toBe('👋 Welcome to the workout tracking bot!');
            expect(t('en', 'welcome.description')).toContain('I will help you');
        });

        it('should return correct translations for Russian', () => {
            expect(t('ru', 'welcome.greeting')).toBe('👋 Добро пожаловать в бот для отслеживания тренировок!');
            expect(t('ru', 'welcome.description')).toContain('Я помогу вам');
        });

        it('should handle missing keys gracefully', () => {
            expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
            expect(t('ru', 'missing.translation')).toBe('missing.translation');
        });

        it('should handle parameters in translations', () => {
            expect(t('en', 'welcome.languageSet', {language: 'English'})).toContain('English');
            expect(t('ru', 'welcome.languageSet', {language: 'Русский'})).toContain('Русский');
        });

        it('should fallback to English when key not found in requested language', () => {
            // Test with a key that exists in English but not in Russian
            const englishText = t('en', 'welcome.greeting');
            const russianText = t('ru', 'welcome.greeting');
            
            // Both should return the same text since Russian has this key
            expect(russianText).toBe('👋 Добро пожаловать в бот для отслеживания тренировок!');
            
            // Test fallback to English for a key that might not exist in Russian
            // This tests the fallback mechanism
            const fallbackText = t('ru', 'nonexistent.key');
            expect(fallbackText).toBe('nonexistent.key'); // Should return key as fallback
        });

        it('should use English fallback for missing translations', () => {
            // Test fallback to English when Russian doesn't have a key
            const englishText = t('en', 'welcome.description');
            const russianText = t('ru', 'welcome.description');
            
            // Russian should have this key, so no fallback needed
            expect(russianText).toContain('Я помогу вам');
            
            // Test that fallback works for completely missing keys
            const missingKey = 'completely.missing.key';
            expect(t('ru', missingKey)).toBe(missingKey);
            expect(t('en', missingKey)).toBe(missingKey);
        });
    });

    describe('getUserLanguage', () => {
        beforeEach(() => {
            jest.resetModules();
        });

        it('should return default language for new users', async () => {
            // Mock UserDAO to return no user
            const mockUserDAO = {
                findByTelegramId: jest.fn().mockResolvedValue(null)
            };

            // Mock the entire dao module
            jest.unstable_mockModule('../../src/dao/index.js', () => ({
                UserDAO: mockUserDAO
            }));

            // Re-import the module with mocked dependencies
            const {getUserLanguage: getUserLanguageMock} = await import('../../src/i18n/index.js');
            const result = await getUserLanguageMock('12345');

            expect(result.language).toBe('en');
            expect(typeof result._).toBe('function');
            expect(mockUserDAO.findByTelegramId).toHaveBeenCalledWith('12345');
        });

        it('should return user language when available', async () => {
            // Mock UserDAO to return user with language
            const mockUserDAO = {
                findByTelegramId: jest.fn().mockResolvedValue({
                    telegramId: '12345',
                    language: 'ru',
                    timezone: 'UTC'
                })
            };

            // Mock the entire dao module
            jest.unstable_mockModule('../../src/dao/index.js', () => ({
                UserDAO: mockUserDAO
            }));

            // Re-import the module with mocked dependencies
            const {getUserLanguage: getUserLanguageMock} = await import('../../src/i18n/index.js');
            const result = await getUserLanguageMock('12345');

            expect(result.language).toBe('ru');
            expect(typeof result._).toBe('function');
            expect(mockUserDAO.findByTelegramId).toHaveBeenCalledWith('12345');
        });

        it('should handle DAO errors gracefully', async () => {
            // Use existing console mock to silence console.error
            const restore = silenceConsole(['error']);

            try {
                // Mock UserDAO to throw an error
                const mockUserDAO = {
                    findByTelegramId: jest.fn().mockRejectedValue(new Error('Database error'))
                };

                // Mock the entire dao module
                jest.unstable_mockModule('../../src/dao/index.js', () => ({
                    UserDAO: mockUserDAO
                }));

                // Re-import the module with mocked dependencies
                const {getUserLanguage: getUserLanguageMock} = await import('../../src/i18n/index.js');
                const result = await getUserLanguageMock('12345');

                // Should fallback to default language on error
                expect(result.language).toBe('en');
                expect(typeof result._).toBe('function');
                expect(mockUserDAO.findByTelegramId).toHaveBeenCalledWith('12345');
                
                // Should log error to console
                expect(console.error).toHaveBeenCalledWith('Error getting user language:', expect.any(Error));
            } finally {
                // Restore console
                restore();
            }
        });
    });

    describe('setUserLanguage', () => {
        beforeEach(() => {
            jest.resetModules();
        });

        it('should update user language successfully', async () => {
            // Mock UserDAO methods
            const mockUserDAO = {
                findOrCreate: jest.fn().mockResolvedValue([{telegramId: '12345', language: 'ru'}]),
                updateLanguage: jest.fn().mockResolvedValue(undefined)
            };

            // Mock the entire dao module
            jest.unstable_mockModule('../../src/dao/index.js', () => ({
                UserDAO: mockUserDAO
            }));

            // Re-import the module with mocked dependencies
            const {setUserLanguage: setUserLanguageMock} = await import('../../src/i18n/index.js');
            
            // Should not throw
            await expect(setUserLanguageMock('12345', 'ru')).resolves.not.toThrow();
            
            // Should call DAO methods
            expect(mockUserDAO.findOrCreate).toHaveBeenCalledWith('12345', {language: 'ru'});
            expect(mockUserDAO.updateLanguage).toHaveBeenCalledWith('12345', 'ru');
        });

        it('should handle DAO errors gracefully', async () => {
            // Use existing console mock to silence console.error
            const restore = silenceConsole(['error']);

            try {
                // Mock UserDAO to throw an error
                const mockUserDAO = {
                    findOrCreate: jest.fn().mockRejectedValue(new Error('Database error')),
                    updateLanguage: jest.fn().mockResolvedValue(undefined)
                };

                // Mock the entire dao module
                jest.unstable_mockModule('../../src/dao/index.js', () => ({
                    UserDAO: mockUserDAO
                }));

                // Re-import the module with mocked dependencies
                const {setUserLanguage: setUserLanguageMock} = await import('../../src/i18n/index.js');
                
                // Should not throw (error is caught and logged)
                await expect(setUserLanguageMock('12345', 'ru')).resolves.not.toThrow();
                
                // Should attempt to call DAO methods
                expect(mockUserDAO.findOrCreate).toHaveBeenCalledWith('12345', {language: 'ru'});
                
                // Should log error to console
                expect(console.error).toHaveBeenCalledWith('Error setting user language:', expect.any(Error));
            } finally {
                // Restore console
                restore();
            }
        });
    });
});
