import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	verbose: true,
	automock: true,
	testMatch: ['**/*.Test.ts'],
	collectCoverage: true,
	coverageReporters: ['html', 'json'],
};

export default jestConfig;


