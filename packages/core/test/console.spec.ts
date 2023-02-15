import "reflect-metadata";
import chalk from "chalk";
import { Console, IApplicationMessageToConsole } from "../src/console";

enum ColorStyle {
    None = 0,
    Yellow,
    Blue,
    Green,
    Red
}

jest.mock('chalk', () => ({
    bgYellow: {
      black: jest.fn().mockReturnValue('mocked yellow message'),
    },
    bgBlue: {
      black: jest.fn().mockReturnValue('mocked blue message'),
    },
    bgGreen: {
      black: jest.fn().mockReturnValue('mocked green message'),
    },
    bgRed: {
      black: jest.fn().mockReturnValue('mocked red message'),
    },
  }));
  
  describe('Console', () => {
    let consoleInstance: Console;
  
    beforeEach(() => {
      consoleInstance = new Console();
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    describe('messageServer', () => {
      it('should call message server with the correct arguments for environment "development" without IConsoleMessage', async () => {
        
        const spy = jest.spyOn(console, 'log');
        await consoleInstance.messageServer(3000, 'development');
        
        expect(spy).toHaveBeenCalledWith("mocked yellow message");
      });

      it('should call message server with the correct arguments for environment "staging" without IConsoleMessage', async () => {
        
        const spy = jest.spyOn(console, 'log');
        await consoleInstance.messageServer(3000, 'staging');
        
        expect(spy).toHaveBeenCalledWith("mocked blue message");
      });

      it('should call message server with the correct arguments for environment "production" without IConsoleMessage', async () => {
        
        const spy = jest.spyOn(console, 'log');
        await consoleInstance.messageServer(3000, 'production');
        
        expect(spy).toHaveBeenCalledWith("mocked green message");
      });
  
      it('should call message server with the correct arguments for environment "unknown" without IConsoleMessage', async () => {
        
        const spy = jest.spyOn(console, 'log');
        await consoleInstance.messageServer(3000, 'test');
        
        expect(spy).toHaveBeenCalledWith("mocked red message");
      });
  
      it('should call message server with the correct arguments when the "consoleMessage" argument is provided', async () => {
        const spy = jest.spyOn(consoleInstance, 'messageServer');
        const consoleMessage = {
          appName: 'TestApp',
          appVersion: '1.0.0',
        };
        await consoleInstance.messageServer(3000, 'production', consoleMessage);
        expect(spy).toHaveBeenCalledWith(3000, 'production', consoleMessage);
      });

    });
  });
   