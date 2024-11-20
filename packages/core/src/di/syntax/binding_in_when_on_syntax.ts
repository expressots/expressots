import { interfaces } from "../interfaces/interfaces";
import { BindingInSyntax } from "./binding_in_syntax";
import { BindingOnSyntax } from "./binding_on_syntax";
import { BindingWhenSyntax } from "./binding_when_syntax";

class BindingInWhenOnSyntax<T>
  implements
    interfaces.BindingInSyntax<T>,
    interfaces.BindingWhenSyntax<T>,
    interfaces.BindingOnSyntax<T>
{
  private _bindingInSyntax: interfaces.BindingInSyntax<T>;
  private _bindingWhenSyntax: interfaces.BindingWhenSyntax<T>;
  private _bindingOnSyntax: interfaces.BindingOnSyntax<T>;
  private _binding: interfaces.Binding<T>;

  public constructor(binding: interfaces.Binding<T>) {
    this._binding = binding;
    this._bindingWhenSyntax = new BindingWhenSyntax<T>(this._binding);
    this._bindingOnSyntax = new BindingOnSyntax<T>(this._binding);
    this._bindingInSyntax = new BindingInSyntax<T>(binding);
  }

  public inRequestScope(): interfaces.BindingWhenOnSyntax<T> {
    return this._bindingInSyntax.inRequestScope();
  }

  public inSingletonScope(): interfaces.BindingWhenOnSyntax<T> {
    return this._bindingInSyntax.inSingletonScope();
  }

  public inTransientScope(): interfaces.BindingWhenOnSyntax<T> {
    return this._bindingInSyntax.inTransientScope();
  }

  public when(
    constraint: (request: interfaces.Request) => boolean,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.when(constraint);
  }

  public whenTargetNamed(name: string): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenTargetNamed(name);
  }

  public whenTargetIsDefault(): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenTargetIsDefault();
  }

  public whenTargetTagged(
    tag: string,
    value: unknown,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenTargetTagged(tag, value);
  }

  public whenInjectedInto(
    parent: NewableFunction | string,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenInjectedInto(parent);
  }

  public whenParentNamed(name: string): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenParentNamed(name);
  }

  public whenParentTagged(
    tag: string,
    value: unknown,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenParentTagged(tag, value);
  }

  public whenAnyAncestorIs(
    ancestor: NewableFunction | string,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenAnyAncestorIs(ancestor);
  }

  public whenNoAncestorIs(
    ancestor: NewableFunction | string,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenNoAncestorIs(ancestor);
  }

  public whenAnyAncestorNamed(name: string): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenAnyAncestorNamed(name);
  }

  public whenAnyAncestorTagged(
    tag: string,
    value: unknown,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenAnyAncestorTagged(tag, value);
  }

  public whenNoAncestorNamed(name: string): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenNoAncestorNamed(name);
  }

  public whenNoAncestorTagged(
    tag: string,
    value: unknown,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenNoAncestorTagged(tag, value);
  }

  public whenAnyAncestorMatches(
    constraint: (request: interfaces.Request) => boolean,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenAnyAncestorMatches(constraint);
  }

  public whenNoAncestorMatches(
    constraint: (request: interfaces.Request) => boolean,
  ): interfaces.BindingOnSyntax<T> {
    return this._bindingWhenSyntax.whenNoAncestorMatches(constraint);
  }

  public onActivation(
    handler: (context: interfaces.Context, injectable: T) => T | Promise<T>,
  ): interfaces.BindingWhenSyntax<T> {
    return this._bindingOnSyntax.onActivation(handler);
  }

  public onDeactivation(
    handler: (injectable: T) => void | Promise<void>,
  ): interfaces.BindingWhenSyntax<T> {
    return this._bindingOnSyntax.onDeactivation(handler);
  }
}

export { BindingInWhenOnSyntax };
