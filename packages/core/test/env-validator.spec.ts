import "reflect-metadata";

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Environments } from '../src/environment';
import * as log from '../src/logger';

jest.mock('fs');
jest.mock('path');
jest.mock('../src/logger', () => ({
    log: {
        Info: jest.fn(),
    },
}));

describe('EnvValidatorProvider', () => {
  describe('Get', () => {
    it('returns the value of the environment variable with the given key', () => {
      const expectedValue = 'test value';
      process.env.TEST_KEY = expectedValue;
      const actualValue = Environments.Get('TEST_KEY');
      expect(actualValue).toEqual(expectedValue);
    });

    it('returns the default value if the environment variable is not defined', () => {
      const defaultValue = 'default value';
      const actualValue = Environments.Get('NON_EXISTENT_KEY', defaultValue);
      expect(actualValue).toEqual(defaultValue);
    });
  });

  describe('CheckAll', () => {
    let originalEnv: NodeJS.ProcessEnv;
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = {};
      logSpy = jest.spyOn(log.log, 'Info').mockImplementation();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    });

    afterEach(() => {
      process.env = originalEnv;
      jest.clearAllMocks();
    });

    it('loads the .env file', () => {
      jest.spyOn(dotenv, 'config').mockImplementation();
      Environments.CheckAll();
      expect(dotenv.config).toHaveBeenCalled();
    });
  });
});
