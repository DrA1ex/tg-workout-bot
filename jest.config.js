export default {
    testEnvironment: 'node',
    testMatch: ['**/?(*.)+(spec|test).js'],
    testPathIgnorePatterns: ['/node_modules/', '/__MACOSX/'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/**/*.spec.js',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
};
