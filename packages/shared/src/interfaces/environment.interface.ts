/* eslint-disable @typescript-eslint/no-namespace */

/**
 * The Environment namespace contains all the types and interfaces related to environment configuration.
 * @namespace Environment
 * @public API
 */
export namespace Env {
  /**
   * Enum representing possible server environments.
   * @public API
   */
  export enum ServerEnvironment {
    Development = "development",
    Production = "production",
    Remote = "remote",
  }

  /**
   * Type representing possible server environments.
   */
  export type TypeServerEnvironment = "development" | "production" | "remote";

  /**
   * Interface for environment configuration options.
   * @public API
   */
  export interface IEnvironment {
    env: {
      development?: string;
      production?: string;
    };
  }

  /**
   * Type representing possible server environments.
   * @public API
   */
  export type Environment = ServerEnvironment | TypeServerEnvironment | undefined;
}

export type Environment = Env.Environment;
export type IEnvironment = Env.IEnvironment;
