import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/packages/core/test/**/*.spec.ts', '<rootDir>/packages/core/test/**/*.test.ts'],
}

export default jestConfig