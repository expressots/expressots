/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */
import { interfaces as inversifyInterfaces } from "../../inversify";

namespace interfaces {
  export type BindConstraint = (
    bind: inversifyInterfaces.Bind,
    target: any,
  ) => any;

  export interface ProvideSyntax {
    constraint: BindConstraint;
    implementationType: any;
  }

  export interface ProvideDoneSyntax {
    done(force?: boolean): (target: any) => any;
  }

  export interface ProvideInSyntax<T> extends ProvideDoneSyntax {
    inSingletonScope(): ProvideWhenOnSyntax<T>;
    inTransientScope(): ProvideWhenOnSyntax<T>;
  }

  export interface ProvideInWhenOnSyntax<T>
    extends ProvideInSyntax<T>,
      ProvideWhenSyntax<T>,
      ProvideOnSyntax<T> {}

  export interface ProvideOnSyntax<T> extends ProvideDoneSyntax {
    onActivation(
      fn: (context: inversifyInterfaces.Context, injectable: T) => T,
    ): ProvideWhenSyntax<T>;
  }

  export interface ProvideWhenSyntax<T> extends ProvideDoneSyntax {
    when(
      constraint: (request: inversifyInterfaces.Request) => boolean,
    ): ProvideOnSyntax<T>;
    whenTargetNamed(name: string): ProvideOnSyntax<T>;
    whenTargetTagged(tag: string, value: any): ProvideOnSyntax<T>;
    whenInjectedInto(parent: Function | string): ProvideOnSyntax<T>;
    whenParentNamed(name: string): ProvideOnSyntax<T>;
    whenParentTagged(tag: string, value: any): ProvideOnSyntax<T>;
    whenAnyAncestorIs(ancestor: Function | string): ProvideOnSyntax<T>;
    whenNoAncestorIs(ancestor: Function | string): ProvideOnSyntax<T>;
    whenAnyAncestorNamed(name: string): ProvideOnSyntax<T>;
    whenAnyAncestorTagged(tag: string, value: any): ProvideOnSyntax<T>;
    whenNoAncestorNamed(name: string): ProvideOnSyntax<T>;
    whenNoAncestorTagged(tag: string, value: any): ProvideOnSyntax<T>;
    whenAnyAncestorMatches(
      constraint: (request: inversifyInterfaces.Request) => boolean,
    ): ProvideOnSyntax<T>;
    whenNoAncestorMatches(
      constraint: (request: inversifyInterfaces.Request) => boolean,
    ): ProvideOnSyntax<T>;
  }

  export interface ProvideWhenOnSyntax<T>
    extends ProvideWhenSyntax<T>,
      ProvideOnSyntax<T> {}
}

export default interfaces;
