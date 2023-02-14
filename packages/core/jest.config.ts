import { Config } from 'jest'

const Configuration: Config = {
  preset: 'ts-jest',
  roots: [
    '<rootDir>/src',
    '<rootDir>/test'
  ],
  testMatch: [
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts'
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node'
}

export default Configuration
