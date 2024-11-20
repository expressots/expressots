/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import interfaces from "../interfaces/interfaces";
import { interfaces as inversifyInterfaces } from "../../inversify";

class ProvideWhenOnSyntax<T> implements interfaces.ProvideWhenOnSyntax<T> {
  private _provideWhenSyntax: interfaces.ProvideWhenSyntax<T>;
  private _provideOnSyntax: interfaces.ProvideOnSyntax<T>;

  public constructor(
    provideWhenSyntax: interfaces.ProvideWhenSyntax<T>,
    provideOnSyntax: interfaces.ProvideOnSyntax<T>,
  ) {
    this._provideWhenSyntax = provideWhenSyntax;
    this._provideOnSyntax = provideOnSyntax;
  }

  public when(
    constraint: (request: inversifyInterfaces.Request) => boolean,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.when(constraint);
  }

  public whenTargetNamed(name: string): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenTargetNamed(name);
  }

  public whenTargetTagged(
    tag: string,
    value: any,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenTargetTagged(tag, value);
  }

  public whenInjectedInto(
    parent: Function | string,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenInjectedInto(parent);
  }

  public whenParentNamed(name: string): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenParentNamed(name);
  }

  public whenParentTagged(
    tag: string,
    value: any,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenParentTagged(tag, value);
  }

  public whenAnyAncestorIs(
    ancestor: Function | string,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenAnyAncestorIs(ancestor);
  }

  public whenNoAncestorIs(
    ancestor: Function | string,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenNoAncestorIs(ancestor);
  }

  public whenAnyAncestorNamed(name: string): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenAnyAncestorNamed(name);
  }

  public whenAnyAncestorTagged(
    tag: string,
    value: any,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenAnyAncestorTagged(tag, value);
  }

  public whenNoAncestorNamed(name: string): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenNoAncestorNamed(name);
  }

  public whenNoAncestorTagged(
    tag: string,
    value: any,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenNoAncestorTagged(tag, value);
  }

  public whenAnyAncestorMatches(
    constraint: (request: inversifyInterfaces.Request) => boolean,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenAnyAncestorMatches(constraint);
  }

  public whenNoAncestorMatches(
    constraint: (request: inversifyInterfaces.Request) => boolean,
  ): interfaces.ProvideOnSyntax<T> {
    return this._provideWhenSyntax.whenNoAncestorMatches(constraint);
  }

  public onActivation(
    fn: (context: inversifyInterfaces.Context, injectable: T) => T,
  ): interfaces.ProvideWhenSyntax<T> {
    return this._provideOnSyntax.onActivation(fn);
  }

  public done(force?: boolean): any {
    return this._provideWhenSyntax.done(force);
  }
}

export default ProvideWhenOnSyntax;
