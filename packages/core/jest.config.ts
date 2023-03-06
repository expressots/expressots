import type { Config } from 'jest'

const jestConfig: Config = {
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
}

export default jestConfig